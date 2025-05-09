// main.js
// 共用功能和初始化代码

// 监听 DOMContentLoaded 事件，确保页面加载完成后执行初始化代码
document.addEventListener('DOMContentLoaded', function() {
    // 页面初始化代码可以写在这里
    // 例如绑定事件、设置默认状态等

    // 示例：在控制台输出一条消息，用于调试
    console.log("页面加载完成，初始化代码已执行");

    // 可以在这里添加更多初始化逻辑
    // 例如：
    // - 初始化侧边栏的点击事件
    // - 设置默认的协议解析区域
    // - 绑定解析按钮的事件监听器等
    createProtocolFrameDescription();
});