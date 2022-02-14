from flask import Flask, render_template, redirect, url_for, request
import config
from name_entity import NameEntity, EntityPair, get_pair, EntityLabel
from copy import copy
import logging

app = Flask(__name__)
name_entity = NameEntity()


class TechView:
    def __init__(self, stem, _name_entity: NameEntity = name_entity):
        self._name_entity = _name_entity
        self.stem = stem
        # 获得数据对
        pair = get_pair(stem)
        # 源文件行
        self.lines = pair.line_list
        # 标注文件label集合
        self.label_list = list(pair.label_set)
        # 所有的标记名
        self.all_mark = EntityPair.all_mark
        # 标记名颜色映射
        self.mark_color_map = self._name_entity.mark_color_map

    @property
    def previous_url(self):
        """上一个文件的链接"""
        url = url_for('file', stem=self._name_entity.previous_file_stem(self.stem))
        return url

    @property
    def next_url(self):
        """下一个文件的链接"""
        url = url_for('file', stem=self._name_entity.next_file_stem(self.stem))
        return url


@app.route('/')
def index():
    """首页直接转跳"""
    return redirect(url_for('default_tech'))


@app.route('/file')
def default_tech():
    """默认选择第一个文件进行标注"""
    return redirect(url_for('file', stem=name_entity.all_stem[0]))


@app.route('/file/<stem>', methods=['GET'])
def file(stem):
    return render_template('file.html', view=TechView(stem))


@app.route('/method/<method>', methods=['POST'])
def label_method(method):
    try:
        # 传参拷贝一份
        json = copy(request.json)
        # 输出请求日志
        logging.warning(json)
        assert method in 'add remove'.split()
        # 拿出来stem
        stem = json.pop('stem')
        # 其他用于生成label，剩余参数不能多也不能少
        label = EntityLabel(**json)
        # 文件对
        pair = get_pair(stem)
        # 开始操作，删除或是添加
        pair.label_set.__getattribute__(method)(label)
        # 保存一下文件
        pair.save_label()
        return 'o' 'j' 'b' 'k'
    except Exception as e:
        return f'{e.__class__.__name__}: {e}', 500


app.run(host=config.host, port=config.port)
