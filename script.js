document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const inputDataTextarea = document.getElementById('input-data');
    const outputDataTextarea = document.getElementById('output-data');
    const processBtn = document.getElementById('process-btn');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');
    const totalPeopleElement = document.getElementById('total-people');
    const totalTimesElement = document.getElementById('total-times');
    const errorList = document.getElementById('error-list');
    const errorCard = document.querySelector('.error-card');

    // 常量定义
    const SCHOOL_NAME = '南京航空航天大学';
    const CAMPUS_FULL_NAMES = {
        '将军路': '南京航空航天大学将军路校区',
        '天目湖': '南京航空航天大学天目湖校区',
        '明故宫': '南京航空航天大学明故宫校区'
    };

    // 监听事件
    processBtn.addEventListener('click', processData);
    clearBtn.addEventListener('click', clearData);
    copyBtn.addEventListener('click', copyResult);

    // 实时处理输入框内容
    inputDataTextarea.addEventListener('input', () => {
        if (inputDataTextarea.value.trim() !== '') {
            processBtn.disabled = false;
        } else {
            processBtn.disabled = true;
        }
    });

    // 单条数据处理函数
    function processLine(line) {
        // 去除多余空格但保留必要空格
        line = line.trim().replace(/\s+/g, ' ');
        if (!line) return null;

        // 检测数据格式异常情况

        // 检查是否有多个9位学号（表示可能是多条记录被粘在一起）
        const allStudentIds = line.match(/\b\d{9}\b/g);
        if (allStudentIds && allStudentIds.length > 1) {
            throw new Error(`一行包含多个学号(${allStudentIds.join(', ')})，请确保每行一条记录`);
        }

        // 检查校区名称是否重复出现
        const campusShortNames = Object.keys(CAMPUS_FULL_NAMES);
        const campusPattern = new RegExp(`(${campusShortNames.join('|')})`, 'gi');
        const campusMatches = line.match(campusPattern);

        if (campusMatches && campusMatches.length > 1) {
            throw new Error(`一行包含多个校区名称(${campusMatches.join(', ')})，请确保每行一条记录`);
        }

        // 检查是否存在多个次数模式（如"XX次"出现多次）
        const countPatternMatches = line.match(/\d+次/g);
        if (countPatternMatches && countPatternMatches.length > 1) {
            throw new Error(`一行包含多个次数标记(${countPatternMatches.join(', ')})，请确保每行一条记录`);
        }

        // 提取学号（9位数字）
        const studentIdMatch = line.match(/\b(\d{9})\b/);
        if (!studentIdMatch) {
            throw new Error(`无法识别9位学号: ${line}`);
        }

        const studentId = studentIdMatch[1];

        // 验证学院代码（前2位，范围01-24）
        const collegeCode = parseInt(studentId.substring(0, 2));
        if (collegeCode < 1 || collegeCode > 24) {
            throw new Error(`学号 ${studentId} 的学院代码无效，必须在01-24范围内`);
        }

        // 提取校区信息
        const campusPattern2 = new RegExp(`(${campusShortNames.join('|')})`, 'i');
        const campusMatch = line.match(campusPattern2);

        if (!campusMatch) {
            throw new Error(`无法识别校区信息 (将军路/天目湖/明故宫): ${line}`);
        }

        const campusShortName = campusMatch[1];
        const campusFullName = CAMPUS_FULL_NAMES[campusShortName];

        // 解析次数
        const countMatch = line.match(/(\d+)次/);
        let count;

        if (countMatch) {
            count = parseInt(countMatch[1]);
        } else {
            // 尝试从字符串中提取最后一个数字作为次数
            const numbers = line.match(/\b(\d+)\b/g);
            if (numbers && numbers.length > 0) {
                // 取最后一个数字作为次数
                count = parseInt(numbers[numbers.length - 1]);
            } else {
                throw new Error(`无法识别次数信息: ${line}`);
            }
        }

        // 验证次数范围（1-100）
        if (count < 1 || count > 100) {
            throw new Error(`次数 ${count} 超出合理范围(1-100): ${line}`);
        }

        // 检查行长度，防止异常长的行（可能是多行粘贴在一起）
        if (line.length > 100) {
            throw new Error(`行内容异常长(${line.length}字符)，可能包含多条记录`);
        }

        // 返回格式化数据
        return {
            studentId,
            schoolName: SCHOOL_NAME,
            campusFullName,
            count
        };
    }

    // 批量数据处理函数
    function processData() {
        // 获取输入文本
        const inputText = inputDataTextarea.value;

        // 尝试检测潜在的数据问题并提供修复建议
        const potentialIssues = detectInputIssues(inputText);
        if (potentialIssues) {
            // 如果检测到潜在问题，显示错误信息并提供修复后的数据
            errorList.innerHTML = '';
            const li = document.createElement('li');
            li.innerHTML = `检测到潜在的数据格式问题：<br>
                           ${potentialIssues.message}<br>
                           <button id="fix-data-btn" class="btn btn-secondary" style="margin-top: 8px;">
                             <span class="material-symbols-outlined">auto_fix</span>
                             应用修复
                           </button>`;
            errorList.appendChild(li);
            errorCard.classList.remove('hidden');

            // 添加修复按钮点击事件
            document.getElementById('fix-data-btn').addEventListener('click', () => {
                inputDataTextarea.value = potentialIssues.fixedData;
                errorCard.classList.add('hidden');
                processData(); // 重新处理修复后的数据
            });

            return;
        }

        const lines = inputText.split('\n');

        // 初始化统计数据
        let totalCount = 0;
        const processedData = [];
        const errors = [];

        // 清空错误列表
        errorList.innerHTML = '';
        errorCard.classList.add('hidden');

        // 逐行处理数据
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 跳过空行
            if (!line) continue;

            try {
                const processed = processLine(line);
                if (processed) {
                    // 累计总次数
                    totalCount += processed.count;

                    // 生成标准格式的输出
                    processedData.push(`${processed.studentId} ${processed.schoolName} ${processed.campusFullName} ${processed.count}`);
                }
            } catch (error) {
                // 捕获并记录错误
                errors.push(`第 ${i + 1} 行: ${error.message}`);
            }
        }

        // 处理结果展示
        if (errors.length > 0) {
            // 显示错误信息
            errors.forEach(error => {
                const li = document.createElement('li');
                li.textContent = error;
                errorList.appendChild(li);
            });
            errorCard.classList.remove('hidden');

            // 滚动到错误信息区域
            errorCard.scrollIntoView({ behavior: 'smooth' });
        }

        // 展示处理后的数据
        outputDataTextarea.value = processedData.join('\n');

        // 更新统计信息
        totalPeopleElement.textContent = processedData.length;
        totalTimesElement.textContent = totalCount;

        // 如果没有任何处理结果但有错误，显示提示信息
        if (processedData.length === 0 && errors.length > 0) {
            outputDataTextarea.value = "所有数据处理失败，请查看上方错误信息进行修正。";
        }
    }

    // 检测潜在的输入数据问题并提供修复建议
    function detectInputIssues(inputText) {
        // 检查是否有异常长的行（可能是多条记录被粘在一起）
        const lines = inputText.split('\n');
        const longLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // 异常长行检测
            if (line.length > 100) {
                longLines.push({ index: i, content: line });
            }

            // 检测是否有多个学号（最可靠的判断标准）
            const studentIds = line.match(/\b\d{9}\b/g);
            if (studentIds && studentIds.length > 1) {
                // 尝试根据学号分割数据
                const fixedLines = [];
                let currentPos = 0;

                for (let j = 0; j < studentIds.length; j++) {
                    const studentId = studentIds[j];
                    const studentIdPos = line.indexOf(studentId, currentPos);

                    // 找到下一个学号的位置或行尾
                    const nextStudentIdPos = (j < studentIds.length - 1)
                        ? line.indexOf(studentIds[j + 1], studentIdPos + studentId.length)
                        : line.length;

                    // 提取当前学号到下一个学号之间的内容
                    const segment = line.substring(studentIdPos, nextStudentIdPos).trim();
                    fixedLines.push(segment);

                    currentPos = nextStudentIdPos;
                }

                // 替换原始数据
                const fixedData = lines.slice();
                fixedData.splice(i, 1, ...fixedLines);

                return {
                    message: `第 ${i + 1} 行包含多个学号，疑似多条记录粘在一起。系统尝试将此行分割为 ${fixedLines.length} 条记录。`,
                    fixedData: fixedData.join('\n')
                };
            }
        }

        // 如果找到长行但没有明确的分割方式，提示用户
        if (longLines.length > 0) {
            return {
                message: `发现 ${longLines.length} 行异常长的内容，可能需要手动分割每行数据。`,
                fixedData: inputText // 无法自动修复
            };
        }

        return null; // 没有检测到问题
    }

    // 清空数据
    function clearData() {
        inputDataTextarea.value = '';
        outputDataTextarea.value = '';
        totalPeopleElement.textContent = '0';
        totalTimesElement.textContent = '0';
        errorList.innerHTML = '';
        errorCard.classList.add('hidden');
        processBtn.disabled = true;
    }

    // 复制结果
    function copyResult() {
        if (outputDataTextarea.value) {
            outputDataTextarea.select();
            document.execCommand('copy');
            // 显示提示消息
            const originalText = copyBtn.textContent;
            copyBtn.innerHTML = '<span class="material-symbols-outlined">check</span>已复制';
            setTimeout(() => {
                copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>复制结果';
            }, 2000);
        }
    }

    // 初始禁用处理按钮
    processBtn.disabled = true;
});