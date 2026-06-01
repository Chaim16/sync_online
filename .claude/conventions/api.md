# 接口规范文档

## 一、接口设计原则

### 1.请求方法

仅支持两种 HTTP 方法：
  - GET：用于查询数据
  - POST：用于新增、修改、删除等操作

### 2.命名规则

全部使用小写 + 下划线（snake_case），示例：
  - get_user_info
  - create_order
  - update_user_profile
  - delete_user_account


## 二、请求参数规范

### 1.参数命名规则
- 所有字段必须使用下划线分割（snake_case）
- 禁止使用驼峰命名（camelCase）

示例：
```json
{
  "user_id": 1,
  "user_name": "test_user",
  "create_time": "2026-01-01"
}
```


### 2.分页参数规则

列表接口如果需要支持分页，分页参数如下：
| 参数名   | 类型  | 默认值 | 说明   |
| ----- | --- | --- | ---- |
| page  | int | 1   | 当前页码 |
| limit | int | 10  | 每页条数 |

示例：GET /get_user_list?page=1&limit=10

## 三、返回数据规范

### 1.统一返回结构
所有接口必须返回如下 JSON 格式：
```json
{
  "code": 0,
  "message": "成功",
  "data": {}
}
```

字段说明：
| 字段名     | 类型     | 说明                   |
| ------- | ------ | -------------------- |
| code    | int    | 状态码（0成功，1失败）         |
| message | string | 提示信息                 |
| data    | object | 返回数据（无数据时返回空字典 `{}`） |

成功示例：
```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "id": 1,
    "name": "test"
  }
}
```
