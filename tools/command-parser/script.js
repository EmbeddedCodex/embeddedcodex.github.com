

// 假设我们有一个DLT645-2007协议的报文
const dlt645Packet = new Uint8Array([
    0x68, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x68, // 地址和起始符
    0x11, // 控制码
    0x04, 0x33, 0x33, 0x33, 0x33, 0xD2, 0x16 // ... 其他字段
]).buffer;

// 加载并解析协议 config/protocols/frame/dlt645-2007.json
loadAndParseProtocol('../../config/protocols/frame/dlt645-2007.json', dlt645Packet)
    .then(result => {
        // 使用解析结果
        // displayResult(result);
        console.log(result)
    });


    