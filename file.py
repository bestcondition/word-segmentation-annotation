import config
from pathlib import Path
import os

class File:
    def __init__(self, stem):

        self.stem = stem

    @property
    def lines(self):
        with open(Path(config.tech_folder) / (self.stem + '.txt'), encoding='utf8') as f:
            lines = f.read().split('\n')

        return lines

    @property
    def data(self):
        """
        四元组: 行， 开始id， 结束id， 标签
        :return: 四元组
        """
        data = []
        path = Path(config.label_folder) / (self.stem + '.txt')
        if os.path.exists(path):
            with open(path, encoding='utf8', mode='r') as f:
                lines = f.read().split('\n')
            for line in lines:
                data.append(line.split())
            return data
        else:
            return 'null'


# file = File('0')
# print(file.data)



