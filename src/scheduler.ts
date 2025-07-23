import { Context } from "koishi";
import { Config } from ".";
import { applyModel } from "./model";

async function groupo_daily_refresh(ctx: Context) {
    await ctx.database.drop("sleep_group");
    applyModel(ctx);
    ctx.logger.info("每日早晚安群数据已刷新！");
}

async function user_weekly_refresh(ctx: Context) {
    ctx.database.upsert("sleep_user", (row) => [
        {
            user: row.user_id,
            last_week_morning_count: row.weekly_morning_count,
            last_week_night_count: row.weekly_night_count,
            last_week_latest_night_time: row.weekly_latest_night_time,
            last_week_earliest_morning_time: row.weekly_earliest_morning_time,
            last_week_sleep_time: row.weekly_sleep_time,
            // 重置当前周数据
            weekly_morning_count: 0,
            weekly_night_count: 0,
            weekly_sleep_time: 0,
            weekly_earliest_morning_time: null,
            weekly_latest_night_time: null
        }
    ]);
    ctx.logger.info("每周 早晚安数据-用户 已刷新！");
}

export async function applycron(ctx: Context, config: Config) {
    ctx.cron(`0 0 ${config.nightStartHour} * * *`, async () => {
        await groupo_daily_refresh(ctx);
    });

    // day of week 1
    ctx.cron(`0 0 * * 1`, async () => {
        await user_weekly_refresh(ctx);
    });
}
