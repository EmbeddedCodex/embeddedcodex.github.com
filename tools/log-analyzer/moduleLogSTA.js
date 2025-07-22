function analyzeModuleLogSTA(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    // 示例：简单解析模块日志 (bin)
    return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join(' ');
}

// 暴露处理函数
export { analyzeModuleLogSTA };
