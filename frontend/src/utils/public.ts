const formatTimestamp = (timestamp: number) => {
  console.log(timestamp);
  // 时间戳是秒级，乘以1000转换为毫秒级
  const date = new Date(timestamp * 1000);
  return date.toLocaleString(); // 格式化为本地日期时间格式
};

export default formatTimestamp;
