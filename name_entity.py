import config
from pathlib import Path
from functools import lru_cache
from collections import namedtuple
from itertools import cycle
import util

DEFAULT_ENCODING = 'utf-8'


# lru cache正好符合要求
@lru_cache(maxsize=16)
def get_pair(stem):
    """最近最久未使用缓存 获取成对的文本+标注对"""
    return EntityPair.from_stem(stem)


# 表示一个标注实体的四元组原型
EntityLabel = namedtuple('EntityLabel', 'line begin end mark')


def fp_no_n(fp):
    """取消换行符"""
    for line in fp:
        if line and line[-1] == '\n':
            yield line[:-1]
        else:
            yield line


class EntityPair:
    """表示原文件和标注文件的对"""
    # 源文件文件夹
    file_root = Path(config.tech_folder)
    # 标注文件文件夹
    label_root = Path(config.label_folder)
    # 源文件后缀
    file_suffix = '.txt'
    # 标注文件后缀
    label_suffix = '.txt'
    # 标注属性分隔符
    LABEL_SEPARATOR = ' '
    # 所有的标记名
    all_mark = list(config.label_list)
    # 默认空label文件
    empty_label_file = util.get_abs_path(r'data/empty_label.txt')

    def __init__(self, stem, line_iter, label_iter):
        # 唯一标识，是个字符串，就是文件名前缀
        self.stem = stem
        # 源文件，list每个元素是一个行，顺序存储
        self.line_list = list(line_iter)
        for line in self.line_list:
            assert isinstance(line, str), f"你甚至都不传字符串进来！"
            assert line.strip(), f'不能出现空行啊！，你看看这个文件{self.stem}'
        # 实体标注的集合，读写都无序
        self.label_set = set(
            EntityLabel(*label)
            for label in label_iter
        )
        for label in self.label_set:
            assert isinstance(label.line, int)
            assert isinstance(label.begin, int)
            assert isinstance(label.end, int)
            assert isinstance(label.mark, str)
            assert label.line >= 0
            assert 0 <= label.begin < label.end
            assert label.mark in self.all_mark, f'{label.mark}'

    @classmethod
    def from_file(cls, text_file, label_file):
        """从文件加载对象"""
        stem = Path(text_file).stem
        with open(text_file, encoding=DEFAULT_ENCODING) as text_fp:
            line_iter = fp_no_n(text_fp)
            with open(label_file, encoding=DEFAULT_ENCODING) as label_fp:
                label_iter = cls._label_yield(label_fp)
                return cls(stem, line_iter, label_iter)

    @classmethod
    def _label_yield(cls, label_fp):
        """label生成器"""
        for line_text in fp_no_n(label_fp):
            if line_text.strip():
                line, begin, end, mark = line_text.split(cls.LABEL_SEPARATOR)
                line = int(line)
                begin = int(begin)
                end = int(end)
                yield line, begin, end, mark

    @classmethod
    def get_text_file(cls, stem):
        return cls.file_root / f'{stem}{cls.file_suffix}'

    @classmethod
    def get_label_file(cls, stem):
        return cls.label_root / f'{stem}{cls.label_suffix}'

    @classmethod
    def from_stem(cls, stem):
        """从stem加载对象，使用默认的存放文件夹"""
        text_file = cls.get_text_file(stem)
        label_file = cls.get_label_file(stem)
        # 不存在就加载空文件进去
        label_file = label_file if label_file.exists() else cls.empty_label_file
        return cls.from_file(text_file, label_file)

    def save_label(self):
        """保存label"""
        with open(self.get_label_file(self.stem), mode='w', encoding=DEFAULT_ENCODING) as fp:
            label_line_list = (
                self.LABEL_SEPARATOR.join(map(str, label))
                for label in self.label_set
            )
            fp.write(
                '\n'.join(label_line_list)
            )


class NameEntity:
    """整体程序控制"""

    COLOR = "blue red yellow green #cccc00 #e62e00 #00b38f #007fff pink #ff9900 #00ff99 gold".split()

    def __init__(self):
        # 颜色循环
        self.color_cycle = cycle(self.COLOR)
        # 文件名列表
        self.all_stem = sorted(
            file.stem
            for file in EntityPair.file_root.iterdir()
            if file.suffix == EntityPair.file_suffix
        )
        # 文件数
        self.file_num = len(self.all_stem)
        # stem|索引 映射
        self.stem_index_map = {
            file: i
            for i, file in enumerate(self.all_stem)
        }
        # 标签|颜色 映射
        self.mark_color_map = {
            mark: color
            for mark, color in zip(EntityPair.all_mark, self.color_cycle)
        }

    def previous_file_stem(self, stem):
        """stem的上一个文件"""
        return self.offset_stem(stem, -1)

    def next_file_stem(self, stem):
        """stem的下一个文件"""
        return self.offset_stem(stem, 1)

    def offset_stem(self, stem, offset):
        """stem偏移offset个之后是谁"""
        now_index = self.stem_index_map[stem]
        offset_index = (now_index + offset) % self.file_num
        return self.all_stem[offset_index]
