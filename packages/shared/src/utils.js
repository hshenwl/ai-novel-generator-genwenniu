"use strict";
// ============================================================
// AI小说创作系统 - 工具函数
// ============================================================
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.delay = delay;
exports.formatDate = formatDate;
exports.countChars = countChars;
exports.countWords = countWords;
exports.truncate = truncate;
exports.deepClone = deepClone;
exports.safeJsonParse = safeJsonParse;
exports.retry = retry;
exports.debounce = debounce;
exports.throttle = throttle;
exports.chunk = chunk;
exports.randomChoice = randomChoice;
exports.randomInt = randomInt;
exports.isNonEmptyString = isNonEmptyString;
exports.isPositiveNumber = isPositiveNumber;
/**
 * 生成UUID
 */
function generateId() {
    return crypto.randomUUID();
}
/**
 * 延迟执行
 */
function delay(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
/**
 * 格式化日期
 */
function formatDate(date, format) {
    if (format === void 0) { format = 'YYYY-MM-DD HH:mm:ss'; }
    var d = typeof date === 'string' ? new Date(date) : date;
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var hours = String(d.getHours()).padStart(2, '0');
    var minutes = String(d.getMinutes()).padStart(2, '0');
    var seconds = String(d.getSeconds()).padStart(2, '0');
    return format
        .replace('YYYY', String(year))
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}
/**
 * 计算字符数（中英文混合）
 */
function countChars(text) {
    // 中文按1字符，英文按0.5字符折算
    var count = 0;
    for (var _i = 0, text_1 = text; _i < text_1.length; _i++) {
        var char = text_1[_i];
        if (/[\u4e00-\u9fa5]/.test(char)) {
            count += 1;
        }
        else {
            count += 0.5;
        }
    }
    return Math.ceil(count);
}
/**
 * 计算字数（中文习惯）
 */
function countWords(text) {
    // 移除空白字符
    var cleaned = text.replace(/\s+/g, '');
    return cleaned.length;
}
/**
 * 截断文本
 */
function truncate(text, maxLength, suffix) {
    if (suffix === void 0) { suffix = '...'; }
    if (text.length <= maxLength)
        return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
}
/**
 * 深拷贝
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * 安全JSON解析
 */
function safeJsonParse(json, fallback) {
    try {
        return JSON.parse(json);
    }
    catch (_a) {
        return fallback;
    }
}
/**
 * 重试函数
 */
function retry(fn_1) {
    return __awaiter(this, arguments, void 0, function (fn, maxRetries, delayMs) {
        var lastError, i, error_1;
        if (maxRetries === void 0) { maxRetries = 3; }
        if (delayMs === void 0) { delayMs = 1000; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < maxRetries)) return [3 /*break*/, 8];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 7]);
                    return [4 /*yield*/, fn()];
                case 3: return [2 /*return*/, _a.sent()];
                case 4:
                    error_1 = _a.sent();
                    lastError = error_1 instanceof Error ? error_1 : new Error(String(error_1));
                    if (!(i < maxRetries - 1)) return [3 /*break*/, 6];
                    return [4 /*yield*/, delay(delayMs * (i + 1))];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [3 /*break*/, 7];
                case 7:
                    i++;
                    return [3 /*break*/, 1];
                case 8: throw lastError;
            }
        });
    });
}
/**
 * 防抖
 */
function debounce(fn, wait) {
    var timeoutId = null;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (timeoutId)
            clearTimeout(timeoutId);
        timeoutId = setTimeout(function () { return fn.apply(void 0, args); }, wait);
    };
}
/**
 * 节流
 */
function throttle(fn, limit) {
    var inThrottle = false;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!inThrottle) {
            fn.apply(void 0, args);
            inThrottle = true;
            setTimeout(function () { return (inThrottle = false); }, limit);
        }
    };
}
/**
 * 分块数组
 */
function chunk(array, size) {
    var result = [];
    for (var i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}
/**
 * 随机选择
 */
function randomChoice(array) {
    if (array.length === 0)
        return undefined;
    return array[Math.floor(Math.random() * array.length)];
}
/**
 * 随机整数
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
/**
 * 判断是否为有效的非空字符串
 */
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
/**
 * 判断是否为有效的正数
 */
function isPositiveNumber(value) {
    return typeof value === 'number' && value > 0;
}
