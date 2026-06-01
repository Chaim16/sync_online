# 命名规范

## 通用原则

- 使用有意义的名称，名称必须表达真实业务含义
推荐：user_id、order_status、payment_amount
禁止：a、b、temp、data1、obj

- 避免无意义缩写
推荐：user_info、payment_record、customer_address
禁止：usr_info、pay_rec、cust_addr

- 统一语言，所有命名统一使用英文。

## 后端命名规范

1. 文件命名，统一使用 snake_case。

推荐：user_service.py
禁止：UserService.py

2. 包目录命名，统一使用 snake_case。

推荐：services
禁止：Services

3. 变量命名，统一使用 snake_case。

4. 函数命名，统一使用 snake_case。

5. 类命名，统一使用 PascalCase。
推荐：UserService
禁止：user_service

6. 常量命名，统一使用全大写。

7. 枚举命名，枚举值统一大写。
推荐：
```python
class UserStatus(Enum):
    ACTIVE = 1
    DISABLED = 2
```

## 数据库命名规范

1. 表名，统一使用 snake_case。
2. 字段名，统一使用 snake_case。
3. 主键，统一使用id。
4. 外键，统一使用user_id，order_id。
5. 时间字段
统一使用：created_time、updated_time、deleted_time
禁止：create_time、update_time、gmt_create

## 前端命名规范

1. 目录命名，统一使用 kebab-case。例如：views/user-management

2. Vue组件命名，组件文件统一使用 PascalCase。例如：UserTable.vue

3. 页面组件，推荐：UserList.vue、UserDetail.vue、OrderList.vue、OrderDetail.vue

4. Composition API变量，const user_name = ref('')

5. 方法命名，统一使用 camelCase。
推荐：loadUserList()、createOrder()、updateUserInfo()
禁止：load_user_list()、CreateOrder()

6. Pinia Store命名
推荐：useUserStore、useOrderStore、useAuthStore
禁止：userStore、order_store

7. API方法命名
推荐：getUserInfo、getUserList、createUser

示例：
```js
export function getUserInfo(params) {
  return request(...)
}
```

8. 环境变量命名，统一大写。例如：APP_ENV

