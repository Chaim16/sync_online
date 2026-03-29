#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
公网临时文件传输系统 (Web版)
基于FastAPI的文件传输服务
"""

import os
import json
import uuid
import hashlib
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
from pathlib import Path
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Form, Query, UploadFile
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import aiofiles
from config import Config
from session_manager import session_manager
from file_manager import file_manager
from websocket_manager import connection_manager as websocket_manager

# 初始化配置
Config.init_temp_dir()

app = FastAPI(
    title=Config.PROJECT_NAME,
    version=Config.VERSION,
    description="基于Web的临时文件传输系统"
)

# 挂载静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    print(f"🌐 {Config.PROJECT_NAME} 启动成功")
    print(f"监听地址: http://{Config.HOST}:{Config.PORT}")
    await session_manager.start_cleanup_task()

@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭事件"""
    print("应用已关闭")
    await session_manager.stop_cleanup_task()

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """主页"""
    return FileResponse("static/index.html")

# API路由
@app.post("/api/session/create")
async def create_session():
    """创建传输会话"""
    try:
        session_info = session_manager.create_session()
        return {
            "session_id": session_info.session_id,
            "verification_code": session_info.verification_code,
            "expires_at": session_info.expires_at.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/session/join")
async def join_session(request: Request):
    """加入传输会话"""
    try:
        data = await request.json()
        verification_code = data.get("verification_code")
        
        if not verification_code:
            raise HTTPException(status_code=400, detail="验证码不能为空")
            
        session = session_manager.join_session(verification_code)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在或验证码错误")
            
        return {
            "session_id": session.session_id,
            "message": "成功加入会话"
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="请求格式错误")

@app.post("/api/file/init-upload")
async def init_file_upload(request: Request):
    """初始化文件上传"""
    try:
        data = await request.json()
        session_id = data.get("session_id")
        file_id = data.get("file_id")
        filename = data.get("filename")
        size = data.get("size")
        mime_type = data.get("mime_type")
        total_chunks = data.get("total_chunks")
        
        # 验证参数
        if not all([session_id, file_id, filename, size, mime_type, total_chunks]):
            raise HTTPException(status_code=400, detail="缺少必要参数")
            
        # 验证会话
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在或已过期")
            
        # 验证文件大小
        if size > Config.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="文件过大")
            
        # 创建文件记录
        file_info = file_manager.create_file_record(
            session_id, filename, size, mime_type, total_chunks
        )
        
        return {
            "file_id": file_info.file_id,
            "message": "文件初始化成功"
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="请求格式错误")

@app.post("/api/file/upload-chunk")
async def upload_chunk(
    session_id: str = Form(...),
    file_id: str = Form(...),
    chunk_index: str = Form(...),  # 改为字符串类型以匹配前端
    total_chunks: str = Form(...),  # 改为字符串类型以匹配前端
    file: UploadFile = Form(...)
):
    """上传文件分片"""
    try:
        # 转换参数类型
        chunk_index_int = int(chunk_index)
        total_chunks_int = int(total_chunks)
        
        # 验证会话
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在或已过期")
            
        # 获取文件信息
        file_info = file_manager.get_file_info(file_id)
        if not file_info:
            raise HTTPException(status_code=404, detail="文件记录不存在")
            
        # 读取文件内容
        file_content = await file.read()
        
        # 保存分片文件
        chunk_filename = f"{file_id}_chunk_{chunk_index_int}"
        chunk_path = Config.TEMP_DIR / chunk_filename
        
        async with aiofiles.open(chunk_path, 'wb') as f:
            await f.write(file_content)
            
        # 更新上传进度
        file_manager.update_chunk_uploaded(file_id, len(file_content))
        
        # 如果是最后一个分片，合并文件并通知 WebSocket
        if chunk_index_int == total_chunks_int - 1:
            # 等待一小段时间确保所有分片都已写入完成
            await asyncio.sleep(0.1)
                    
            # 合并文件
            merged_filename = f"{file_id}_merged"
            merged_path = Config.TEMP_DIR / merged_filename
                    
            async with aiofiles.open(merged_path, 'wb') as merged_file:
                for i in range(total_chunks_int):
                    chunk_file = Config.TEMP_DIR / f"{file_id}_chunk_{i}"
                    if chunk_file.exists():
                        async with aiofiles.open(chunk_file, 'rb') as cf:
                            chunk_data = await cf.read()
                            await merged_file.write(chunk_data)
                    
            print(f"✅ 文件合并完成：{file_info.filename} ({file_info.size / 1024 / 1024:.2f} MB)")
                    
            # 通知 WebSocket
            await websocket_manager.broadcast_to_session(
                session_id, 
                json.dumps({"type": "file_update", "file_id": file_id})
            )
            
        return {"message": "分片上传成功"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail="参数格式错误")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/files/list")
async def list_files(session_id: str = Query(...)):
    """获取文件列表"""
    # 验证会话
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在或已过期")
        
    files = file_manager.get_session_files(session_id)
    return {"files": files}

@app.post("/api/text/send")
async def send_text_message(request: Request):
    """发送文本消息"""
    try:
        data = await request.json()
        session_id = data.get("session_id")
        content = data.get("content")
        
        if not session_id or not content:
            raise HTTPException(status_code=400, detail="缺少必要参数")
            
        # 验证会话
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在或已过期")
            
        # 限制文本长度
        if len(content) > 10000:  # 10KB限制
            raise HTTPException(status_code=400, detail="文本内容过长")
            
        # 添加文本消息
        message = file_manager.add_text_message(session_id, content, "sender")
        
        # 通过WebSocket广播给接收方
        await websocket_manager.broadcast_to_session(
            session_id,
            json.dumps({
                "type": "text_message",
                "data": {
                    "message_id": message.message_id,
                    "content": message.content,
                    "timestamp": message.timestamp.isoformat(),
                    "sender_role": "sender"
                }
            })
        )
        
        return {
            "message_id": message.message_id,
            "timestamp": message.timestamp.isoformat(),
            "message": "文本发送成功"
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="请求格式错误")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/text/history")
async def get_text_history(session_id: str = Query(...)):
    """获取文本消息历史"""
    # 验证会话
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在或已过期")
        
    messages = file_manager.get_session_text_messages(session_id)
    
    # 转换为响应格式
    # 对于历史消息，接收方看到的所有消息都应该显示复制按钮
    # 因此将所有消息标记为"receiver"角色
    message_list = [
        {
            "message_id": msg.message_id,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat(),
            "sender_role": "receiver"  # 接收方查看历史时，所有消息都视为可复制
        }
        for msg in messages
    ]
    
    return {"messages": message_list}

@app.get("/api/file/download")
async def download_file(session_id: str = Query(...), file_id: str = Query(...)):
    """下载文件"""
    # 验证会话
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在或已过期")
        
    # 获取文件信息
    file_info = file_manager.get_file_info(file_id)
    if not file_info:
        raise HTTPException(status_code=404, detail="文件不存在")
        
    if not file_info.upload_complete:
        raise HTTPException(status_code=400, detail="文件尚未上传完成")
        
    # 合并分片文件
    merged_filename = f"{file_id}_merged"
    merged_path = Config.TEMP_DIR / merged_filename
    
    if not merged_path.exists():
        # 合并所有分片
        async with aiofiles.open(merged_path, 'wb') as merged_file:
            for chunk_index in range(file_info.total_chunks):
                chunk_filename = f"{file_id}_chunk_{chunk_index}"
                chunk_path = Config.TEMP_DIR / chunk_filename
                
                if chunk_path.exists():
                    async with aiofiles.open(chunk_path, 'rb') as chunk_file:
                        chunk_data = await chunk_file.read()
                        await merged_file.write(chunk_data)
                        
    # 更新下载进度
    file_manager.start_download(file_id)
    
    # 返回文件
    return FileResponse(
        path=str(merged_path),
        filename=file_info.filename,
        media_type=file_info.mime_type
    )

# WebSocket路由
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, role: str = "sender"):
    """WebSocket连接端点"""
    # 验证会话
    session = session_manager.get_session(session_id)
    if not session:
        await websocket.close(code=4004, reason="会话不存在或已过期")
        return
        
    # 建立连接
    websocket_id = await websocket_manager.connect(websocket, session_id, role)
    
    try:
        while True:
            data = await websocket.receive_text()
            # 处理WebSocket消息
            await websocket.send_text(f"收到消息: {data}")
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket_id, session_id)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=Config.DEBUG
    )