// 解析工具
class ProtocolParser {
    constructor(protocolDefinition) {
        this.protocol = protocolDefinition;
    }

    parse(buffer) {
        let result = {};
        let offset = 0;
        let bufferView = new DataView(buffer);

        for (let field of this.protocol.fields) {
            try {
                let fieldResult = this.parseField(field, bufferView, offset, result);
                result[field.name] = fieldResult.value;
                offset = fieldResult.newOffset;
            } catch (e) {
                console.error(`Error parsing field ${field.name}: ${e.message}`);
                throw e;
            }
        }

        return result;
    }

    parseField(field, bufferView, offset, currentResult) {
        switch (field.type) {
            case 'fixed':
                return this.parseFixedField(field, bufferView, offset);
            case 'bytes':
                return this.parseBytesField(field, bufferView, offset, currentResult);
            case 'bits':
                return this.parseBitsField(field, bufferView, offset);
            case 'dynamic':
                return this.parseDynamicField(field, bufferView, offset, currentResult);
            case 'checksum':
                return this.parseChecksumField(field, bufferView, offset, currentResult);
            default:
                throw new Error(`Unknown field type: ${field.type}`);
        }
    }

    parseFixedField(field, bufferView, offset) {
        const expectedValue = parseInt(field.value, 16);
        const actualValue = bufferView.getUint8(offset);

        if (actualValue !== expectedValue) {
            throw new Error(`Fixed field ${field.name} expected ${field.value} but got ${actualValue.toString(16)}`);
        }

        return {
            value: field.value,
            newOffset: offset + field.size
        };
    }

    parseBytesField(field, bufferView, offset, currentResult) {
        let size = field.size;
        if (size === 'dynamic' && field.determinedBy) {
            size = currentResult[field.determinedBy];
        }

        let bytes = [];
        for (let i = 0; i < size; i++) {
            bytes.push(bufferView.getUint8(offset + i).toString(16).padStart(2, '0'));
        }

        let value;
        switch (field.format) {
            case 'bcd':
                value = this.parseBcd(bytes);
                break;
            case 'integer':
                value = this.parseInteger(bytes, field.endianness);
                break;
            case 'float':
                value = this.parseFloat(bytes, field.endianness);
                break;
            default: // 默认返回16进制字符串表示
                value = bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
        }

        return {
            value: value,
            newOffset: offset + size
        };
    }

    parseBitsField(field, bufferView, offset) {
        const byte = bufferView.getUint8(offset);
        let result = {};

        for (let bitField of field.bitFields) {
            const mask = (1 << bitField.bits) - 1;
            const value = (byte >> bitField.position) & mask;
            result[bitField.name] = value;
        }

        return {
            value: result,
            newOffset: offset + field.size
        };
    }

    parseDynamicField(field, bufferView, offset, currentResult) {
        if (field.reference && field.operation === 'length') {
            const refValue = currentResult[field.reference];
            const length = refValue.length; // 根据实际情况可能需要调整
            return {
                value: length,
                newOffset: offset + field.size
            };
        }
        throw new Error(`Unsupported dynamic field configuration`);
    }

    parseChecksumField(field, bufferView, offset, currentResult) {
        // 简化的校验和验证
        let sum = 0;
        const startIndex = this.getFieldOffset(field.range[0]);
        const endIndex = this.getFieldOffset(field.range[1]) + this.getFieldSize(field.range[1]);

        for (let i = startIndex; i < endIndex; i++) {
            sum += bufferView.getUint8(i);
        }

        const checksum = bufferView.getUint8(offset);
        const isValid = (sum & 0xFF) === checksum;

        return {
            value: {
                calculated: sum & 0xFF,
                actual: checksum,
                valid: isValid
            },
            newOffset: offset + field.size
        };
    }

    parseBcd(bytes) {
        // BCD解码实现
        let result = '';
        for (let byte of bytes) {
            result += (parseInt(byte, 16) >> 4).toString();
            result += (parseInt(byte, 16) & 0x0F).toString();
        }
        return result;
    }

    parseInteger(bytes, endianness = 'big') {
        let result = 0;
        if (endianness === 'big') {
            for (let i = 0; i < bytes.length; i++) {
                result = (result << 8) | parseInt(bytes[i], 16); // 隐式转换对16进制无效
            }
        } else { // little endian
            for (let i = bytes.length - 1; i >= 0; i--) {
                result = (result << 8) | parseInt(bytes[i], 16);
            }
        }
        return result;
    }

    getFieldOffset(fieldName) {
        // 实现获取字段偏移量的逻辑
        // 简化版，实际需要根据协议定义计算
        return 0;
    }

    getFieldSize(fieldName) {
        // 实现获取字段大小的逻辑
        // 简化版，实际需要根据协议定义计算
        return 1;
    }
}

// 使用示例
async function loadAndParseProtocol(protocolFile, buffer) {
    try {
        const response = await fetch(protocolFile);
        const protocolDef = await response.json();

        const parser = new ProtocolParser(protocolDef);
        const result = parser.parse(buffer);

        console.log("Parsed result:", result);
        return result;
    } catch (error) {
        console.error("Error loading or parsing protocol:", error);
        throw error;
    }
}

// // 假设我们有一个DLT645-2007协议的报文
// const dlt645Packet = new Uint8Array([
//     0x68, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x68, // 地址和起始符
//     0x11, // 控制码
//     0x04, 0x33, 0x33, 0x33, 0x33, 0xD2, 0x16 // ... 其他字段
// ]).buffer;

// // 加载并解析协议 config/protocols/frame/dlt645-2007.json
// loadAndParseProtocol('../../config/protocols/frame/dlt645-2007.json', dlt645Packet)
//     .then(result => {
//         // 使用解析结果
//         // displayResult(result);
//         console.log(result)
//     });

document.addEventListener('DOMContentLoaded', async () => {
    console.log('docs/tools/command-parser/script.js');
});