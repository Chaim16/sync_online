# 接口规范文档

## 一、接口设计原则

- 仅支持两种 HTTP 方法：
  - GET：用于查询数据
  - POST：用于新增、修改、删除等操作


## 二、接口命名规范

### 1. 命名规则
- 全部使用小写 + 下划线（snake_case）
- 示例：
  - get_user_info
  - create_order
  - update_user_profile
  - delete_user_account

## 三、请求参数规范

### 1. 参数命名规则
- 所有字段必须使用下划线分割（snake_case）
- 禁止使用驼峰命名（camelCase）

示例：
```json
{
  "user_id": 1,
  "user_name": "test_user",
  "create_time": "2026-01-01"
}

