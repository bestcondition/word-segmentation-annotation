# stem_file = r"E:\提交\排查验证\第1份.txt"

# 待标注文件存放位置，358
tech_folder = r"tech"

# 标记文件存放位置，需要事先创建好
label_folder = r'label'

# 类型存放位置
# type_folder = r"E:\提交\特殊类型表格"

# 标签
label_list = [
    'PER',
    'LOC',
    'ORG',
]

# 分类类别
type_list = [
    # 'tech_split',
    # 'sheet_close',
    # 'sheet_split',
    # 'unknown',
    'less',
    'another'
]

# 工作类型，type表示分类，mark表示标注
# work_type = 'type'
work_type = 'mark'

# 服务器
host = '0.0.0.0'
port = 3953
