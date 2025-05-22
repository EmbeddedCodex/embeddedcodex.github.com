import json

def add_prefix_to_tabs(data, parent_id=None, grandparent_id=None):
    """
    递归函数，为上下行报文添加前缀
    """
    if isinstance(data, dict):
        current_id = data.get("id")
        if current_id == "上行报文" or current_id == "下行报文":
            prefix = f"{grandparent_id}_{parent_id}" if grandparent_id and parent_id else ""
            data["id"] = f"{prefix}_{current_id}" if prefix else current_id

        # 递归处理子节点
        for key, value in data.items():
            if isinstance(value, dict):
                add_prefix_to_tabs(value, current_id, parent_id)
            elif isinstance(value, list):
                for item in value:
                    add_prefix_to_tabs(item, current_id, parent_id)

def process_json_file(input_file_path, output_file_path):
    """
    读取JSON文件，处理数据，然后将结果写回到文件
    """
    try:
        # 读取JSON文件
        with open(input_file_path, 'r', encoding='utf-8') as file:
            json_data = json.load(file)

        # 处理JSON数据
        add_prefix_to_tabs(json_data)

        # 将处理后的数据写回到文件
        with open(output_file_path, 'w', encoding='utf-8') as file:
            json.dump(json_data, file, ensure_ascii=False, indent=2)

        print(f"处理完成，结果已保存到 {output_file_path}")
    except Exception as e:
        print(f"处理JSON文件时发生错误: {e}")

# 输入文件路径和输出文件路径
input_file_path = './json/3762.json'  # 替换为你的输入文件路径
output_file_path = '3762_processed.json'  # 替换为你的输出文件路径

# 调用函数处理文件
process_json_file(input_file_path, output_file_path)