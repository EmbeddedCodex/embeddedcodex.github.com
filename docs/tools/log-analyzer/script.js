import { analyzeMachineLog } from './machineLog.js';
import { analyzeModuleLogCCO } from './moduleLogCCO.js';
import { analyzeModuleLogSTA } from './moduleLogSTA.js';

document.addEventListener('DOMContentLoaded', function () {
    // 文件选择器事件监听
    document.getElementById('log-file').addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const fileType = getFileType(file.name); // 根据文件扩展名获取文件类型
            const fileSize = getFileSize(file.size); // 转换文件大小为易读格式
            document.getElementById('file-type').value = fileType;
            document.getElementById('file-size').value = fileSize;
        } else {
            document.getElementById('file-type').value = '';
            document.getElementById('file-size').value = '';
        }
    });

    // 根据文件扩展名获取文件类型
    function getFileType(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        switch (extension) {
            case 'txt':
                return '文本文件';
            case 'bin':
                return '二进制文件';
            default:
                return '未知文件类型';
        }
    }

    // 文件大小格式化函数
    function getFileSize(size) {
        if (size < 1024) {
            return size + ' B';
        } else if (size < 1024 * 1024) {
            return (size / 1024).toFixed(2) + ' KB';
        } else if (size < 1024 * 1024 * 1024) {
            return (size / (1024 * 1024)).toFixed(2) + ' MB';
        } else {
            return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        }
    }

    // 日志分析工具逻辑
    document.getElementById('analyze-log-btn').addEventListener('click', function () {
        const logFileInput = document.getElementById('log-file');
        const logTypeSelect = document.getElementById('log-type');

        const file = logFileInput.files[0];
        const logType = logTypeSelect.value;

        if (!file) {
            updateStatus('请选择一个日志文件');
            return;
        }

        updateStatus(`正在解析 ${logType} 日志...`);

        // 根据文件类型和日志类型进行解析
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = function (event) {
            const fileContent = event.target.result;
            parseLogFile(fileContent, logType);
            updateStatus(`解析完成，结果显示在下方`);
        };
    });

    // 更新状态栏
    function updateStatus(message) {
        document.getElementById('status-bar').textContent = message;
    }

    // 日志文件解析函数
    function parseLogFile(fileContent, logType) {
        let result = '';

        if (logType === 'machine-log') {
            result = analyzeMachineLog(fileContent);
        } else if (logType === 'module-log-cco') {
            result = analyzeModuleLogCCO(fileContent);
        } else if (logType === 'module-log-sta') {
            result = analyzeModuleLogSTA(fileContent);
        }

        return result;
    }
});
