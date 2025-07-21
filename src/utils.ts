import moment from "moment-timezone";
import { Config } from ".";

export function isTimeInMorningRange(tz: string, now_time: moment.Moment, start_time: number, end_time: number) {
    let dateStr = now_time.format("YYYY-MM-DD");
    let start = moment.tz(`${dateStr}T${String(start_time).padStart(2, "0")}:00:00`, tz);
    let end = moment.tz(`${dateStr}T${String(end_time).padStart(2, "0")}:00:00`, tz);
    if (end_time <= start_time) {
        if (now_time.hour() < end_time) {
            start = start.subtract(1, "days");
        } else {
            end = end.add(1, "days");
        }
    }
    return now_time.isBetween(start, end, undefined, "[]");
}

export function isTimeInNightRange(tz: string, now_time: moment.Moment, start_time: number, end_time: number) {
    let dateStr = now_time.format("YYYY-MM-DD");
    let start = moment.tz(`${dateStr}T${String(start_time).padStart(2, "0")}:00:00`, tz);
    let end = moment.tz(`${dateStr}T${String(end_time).padStart(2, "0")}:00:00`, tz);
    if (end_time <= start_time) {
        if (now_time.hour() < end_time) {
            start = start.subtract(1, "days");
        } else {
            end = end.add(1, "days");
        }
    }
    return now_time.isBetween(start, end, undefined, "[]");
}

interface TimeObj {
    hour: number;
    minute: number;
}

/**
 * 获取调整后的分钟数 - 优化版本
 * @param timeObj 时间对象，包含 hour 和 minute
 * @returns [调整后的分钟数, 是否为凌晨时段]
 */
export function get_adjusted_minutes(config: Config, timeObj: TimeObj = { hour: 0, minute: 0 }): [number, boolean] {
    const totalMinutes = timeObj.hour * 60 + timeObj.minute;
    const lateTimeHour = config.morningStartHour;
    const earlyTimeHour = config.nightEndHour;

    // 凌晨时段（0点 - late_time点）
    if (timeObj.hour >= 0 && timeObj.hour < lateTimeHour) {
        return [totalMinutes + 1440, true]; // 加24小时的分钟数
    }
    // 夜晚时段（early_time点 - 23点）
    else if (earlyTimeHour <= timeObj.hour && timeObj.hour <= 23) {
        return [totalMinutes, false];
    }

    throw new Error(`时间 ${timeObj.hour}:${timeObj.minute} 不在有效范围内`);
}
