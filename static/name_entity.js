/*
默认颜色参数
 */

//默认背景颜色
let DEFAULT_BACKGROUND_COLOR = ''
//选中的背景颜色
let SELECT_BACKGROUND_COLOR = "#409FFF"

/*
内部数据声明
 */
let stem = null

//所有的行
let lines = []
//标记名颜色绑定
let mark_color_map = {}
//所有的标记名
let mark_list = []

/*
根据行号获得那一行的标记集合
虽然是个map但是我用array实现也不为过把
因为行数是固定的  
[行号][开始位] = label
*/
let line_label_set_map = []
//颜色矩阵
let line_color_list_map = []
//反向对应，char对应label的矩阵
let char_label_map = []


/*
选择模块
 */

//选区module
selection = {
    //当前的行
    line: null,
    //在哪个索引点下
    down: null,
    //在哪个索引抬起
    up: null,
    //经过
    over: null,
    //选区range是取头不取尾的
    //获取当前选区
    get_range: () => {
        if (selection.line !== null && selection.down !== null) {//说明按下了
            if (selection.up !== null) {//说明抬起了
                return down_up_to_range(selection.down, selection.up)
            } else {//没抬起就按经过算喽 按over
                return down_up_to_range(selection.down, selection.over)
            }
        } else {//没按下就返回null
            return null
        }
    },
    //重置参数
    reset: () => {
        selection.line = null
        selection.down = null
        selection.over = null
        selection.up = null
    }
}
//先声明一下range取头不取尾
//从按下和抬起的位置返回选区range
function down_up_to_range(down, up) {
    if (down <= up) {//正着选择
        return new Range(down, up + 1)
    } else {//倒着选
        return new Range(up, down)//也就是说倒着选不包含down
    }
}

/*
类的定义
 */

//选区对象，包含begin不包含end
function Range(begin, end) {
    this.begin = begin
    this.end = end
}

//标记对象
function Label(line, range, mark) {
    //行号
    this.line = line
    //选区
    this.range = range
    //标记名
    this.mark = mark
}

//字的位置
function CharPos(row, col) {
    this.row = row
    this.col = col
}

/*
数据初始化函数
 */

function init(lines_, label_list_, mark_color_map_, mark_list_) {
    //给每个char都注入一个char_pos
    inject_char_pos()

    lines = lines_
    mark_color_map = mark_color_map_
    mark_list = mark_list_

    //正向map
    line_label_set_map = new Array(lines.length).fill(new Map())
    //颜色map
    line_color_list_map = new Array(lines.length)
    //反向map
    char_label_map = new Array(lines.length)
    for (let row = 0; row < lines.length; row++) {
        let col_x = lines[row].length
        //row行全部为空
        char_label_map[row] = new Array(col_x).fill(null)
        //颜色列表
        line_color_list_map[row] = new Array(col_x).fill(DEFAULT_BACKGROUND_COLOR)
    }
    //按照每个label初始化三个map
    for (let label of label_list_) {
        const line = parseInt(label[0])
        const range = new Range(
            parseInt(label[1]),
            parseInt(label[2])
        )
        label = new Label(line, range, label[3])
        add_label_to_map(label)
        mark_label_end(label)
    }

    //颜色全部填充
    for (let i = 0; i < lines.length; i++) {
        draw_line(i, null)
    }
}

//给每个char都注入一个char_pos用来表示位置
function inject_char_pos() {
    let char_list = document.getElementsByClassName('char')
    for (let char of char_list) {
        char.char_pos = get_char_pos_by_id(char.id)
    }
}

/*
回调函数
 */

//取消右键默认弹出菜单
document.oncontextmenu = function (e) {
    e.preventDefault()
}

//鼠标按下
document.onmousedown = (e) => {
    switch (e.button) {
        case 0: {//按下左键
            //左键按下肯定先还原，无论那种情况
            reset_selection_and_color()
            if (e.target.hasOwnProperty('char_pos')) {//按下的地方是char的node
                div_down(e.target.char_pos)
            }
            break
        }
    }
}
//鼠标经过
document.onmouseover = (e) => {

    if (e.target.hasOwnProperty('char_pos')) {//按下的地方是char的node
        div_over(e.target.char_pos)
    }
}
//鼠标抬起
document.onmouseup = async (e) => {

    switch (e.button) {
        case 0: {//鼠标左键抬起
            if (selection.down !== null) {//如果已经按下
                selection.up = selection.over//将抬起位置设置为over位置
            }
            return
        }
        case 2: {//右键抬起
            if (e.target.hasOwnProperty('char_pos')) {//按下的地方是char的node
                const char_pos = e.target.char_pos
                const label = char_label_map[char_pos.row][char_pos.col]
                if (label !== null) {//如果有绑定就删除
                    //删除
                    await del_label(label)
                }
            }
            return
        }
    }
}

//按键
document.addEventListener('keydown', async function (e) {
    if (e.code === 'ArrowLeft')
        document.getElementById('previous').click()
    else if (e.code === 'ArrowRight')
        document.getElementById('next').click()
    else {
        let num = num_input.send(e)
        if (num !== KEY_STATUS.NO_RETURN) {
            if (num < mark_list.length) {
                let mark = mark_list[num]
                await add_label(mark)
            }
        }
    }
})


//div鼠标按下
function div_down(char_pos) {
    //设置行
    selection.line = char_pos.row
    //设置down下标
    selection.down = char_pos.col
    // then
    //因为down必定发生在over后，所以只能手动调用一次
    div_over(char_pos)

}

//div鼠标经过
function div_over(char_pos) {
    if (char_pos.row === selection.line) {//经过的行和按下的行一样
        selection.over = char_pos.col
        if (selection.up === null) {//当鼠标还没抬起时才染色
            callback_draw()
        }
    } else {//有可能还没按下，有可能行不一样，总之，不处理
    }
}

//染色回调函数
function callback_draw() {
    let range = selection.get_range()
    if (range !== null) {
        //当前选区行号
        let line_no = selection.line
        //未加选区的颜色，一定得拷贝一下啊，不然会改变原数据的
        let color_list = [...line_color_list_map[line_no]]
        //替换选区的颜色
        set_color_by_range(color_list, range, SELECT_BACKGROUND_COLOR)
        //染色
        draw_line(line_no, color_list)
    } else {//没获得到选区说明没什么可染色的

    }
}

/*
背景颜色辅助相关函数
 */

//重置选区和颜色
function reset_selection_and_color() {
    if (selection.line !== null) {
        draw_line(selection.line, null)
    }
    selection.reset()
}


//通过range设置颜色
function set_color_by_range(color_list, range, color) {
    for (let i = range.begin; i < range.end; i++) {
        //设置颜色
        color_list[i] = color
    }
}


//按照color_list将line染色，也可以传color_list为空，默认染颜色矩阵中的颜色
function draw_line(line_no, color_list) {
    if (color_list === null) {
        //获得颜色矩阵中的颜色
        color_list = line_color_list_map[line_no]
    }
    for (let i = 0; i < lines[line_no].length; i++) {
        let char_node = get_node_by_line_char(line_no, i)
        char_node.style.backgroundColor = color_list[i]
    }
}

/*
其他辅助函数
 */

//通过行号字号获得id
function get_id_by_line_char(line_no, char_no) {
    return '' + line_no + '_' + char_no
}

//通过行号字号获得节点
function get_node_by_line_char(line_no, char_no) {
    let id = get_id_by_line_char(line_no, char_no)
    return document.getElementById(id)
}

//通过id反推出行号字号
function get_char_pos_by_id(id) {
    let split_list = id.split('_')
    return new CharPos(
        parseInt(split_list[0]),
        parseInt(split_list[1])
    )
}

//通过char pos获取label，没有就是null
function get_label_by_char_pos(char_pos) {
    return char_label_map[char_pos.row][char_pos.col]
}

//反向map设置label
function set_label_in_char_label_map(label, del) {
    for (let i = label.range.begin; i < label.range.end; i++) {
        //反向map
        char_label_map[label.line][i] = del ? null : label
    }
}


//添加一个label到三个map中
function add_label_to_map(label) {
    //正向map
    line_label_set_map[label.line].set(label.range.begin, label)
    //反向map
    set_label_in_char_label_map(label, false)
    //颜色map
    set_color_by_range(
        line_color_list_map[label.line],
        label.range,
        mark_color_map[label.mark]
    )
}

//删除label在三个map中
function del_label_in_map(label) {
    line_label_set_map[label.line].delete(label.range.begin)
    set_label_in_char_label_map(label, true)
    set_color_by_range(
        line_color_list_map[label.line],
        label.range,
        DEFAULT_BACKGROUND_COLOR
    )
}

//后端交互
async function fetch_label(url, label) {
    const request = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            stem: stem,
            line: label.line,
            begin: label.range.begin,
            end: label.range.end,
            mark: label.mark
        })
    })
    if (request.ok) {
        return true
    } else {
        alert(await request.text())
        return false
    }

}

//添加
async function add_label(mark) {
    const label = new Label(
        selection.line,
        selection.get_range(),
        mark
    )
    const flag = fetch_label('/method/add', label)
    if (flag) {
        add_label_to_map(label)
        reset_selection_and_color()
        mark_label_end(label)
        draw_line(label.line, null)
    }
    return flag
}

//删除
async function del_label(label) {
    const flag = fetch_label('/method/remove', label)
    if (flag) {
        del_label_in_map(label)
        unmark_label_end(label)
        draw_line(label.line, null)
    }
    return flag
}

//获得最后一位
function get_label_end_char(label) {
    return get_node_by_line_char(label.line, label.range.end - 1)
}

//获得原始数据
function get_real_char(node) {
    const char_pos = node.char_pos
    return lines[char_pos.row][char_pos.col]
}

//标记最后一位
function mark_label_end(label) {
    const node = get_label_end_char(label)
    node.innerHTML = get_real_char(node) + '[' + label.mark + ']'
}

//取消最后一位标记
function unmark_label_end(label) {
    const node = get_label_end_char(label)
    node.innerHTML = get_real_char(node)

}

//输入系统的参数
KEY_STATUS = {
    NO_RETURN: {},
    NO_VALUE: {},
}

//两位数字输入法
function TwoDigitsInput() {
    //第一位
    this.first = KEY_STATUS.NO_VALUE
    //第二位
    this.second = KEY_STATUS.NO_VALUE
    //发送监听事件
    this.send = function (e) {
        let match = /(Digit|Numpad)(\d)/.exec(e.code)
        //匹配到
        if (match) {
            let mode = match[1]
            let num = parseInt(match[2])
            if (this.first !== KEY_STATUS.NO_VALUE) {//第一个有值
                this.second = num
            } else {//第一个没值
                if (mode === 'Numpad') {//按的小键盘
                    this.first = 0
                    this.second = num
                } else { // 按的大键盘
                    this.first = num
                }
            }
            //看看能不能返回
            return this.ret()
        }
    }
    this.ret = function () {
        if (this.first !== KEY_STATUS.NO_VALUE && this.second !== KEY_STATUS.NO_VALUE) {
            let value = this.first * 10 + this.second
            this.reset()
            return value
        } else {
            return KEY_STATUS.NO_RETURN
        }
    }
    //重置两个位
    this.reset = function () {
        this.first = KEY_STATUS.NO_VALUE
        this.second = KEY_STATUS.NO_VALUE
    }
}

//数字输入系统
let num_input = new TwoDigitsInput()