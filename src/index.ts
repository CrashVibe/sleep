import { Context, Schema } from "koishi";
import { applyModel } from "./model";
import { get_all_morning_night_data, get_morning, get_night } from "./data_source";
import moment from "moment-timezone";
import {} from "koishi-plugin-cron";
import { applycron } from "./scheduler";

export const name = "sleep";
export const inject = ["database", "cron"];

export interface Config {
    timezone: string;
    morningEnable: boolean;
    morningStartHour: number;
    morningEndHour: number;
    multiGetUpEnable: boolean;
    multiGetUpInterval: number;
    superGetUpEnable: boolean;
    superGetUpInterval: number;
    nightEnable: boolean;
    nightStartHour: number;
    nightEndHour: number;
    goodSleepEnable: boolean;
    goodSleepInterval: number;
    deepSleepEnable: boolean;
    deepSleepInterval: number;
    MORNING_MESSAGES: string[];
    NIGHT_MESSAGES: string[];
    morningPrompts: string[];
    nightPrompts: string[];
}

export const Config: Schema<Config> = Schema.object({
    timezone: Schema.string().default("Asia/Shanghai").description("设置时区，默认为 Asia/Shanghai (上海)"),
    morningEnable: Schema.boolean().default(true).description("早安时段功能开关"),
    morningStartHour: Schema.number().default(6).description("早安时段最早时间 (小时)"),
    morningEndHour: Schema.number().default(14).description("早安时段最晚时间 (小时)"),
    multiGetUpEnable: Schema.boolean().default(false).description("多次起床功能开关"),
    multiGetUpInterval: Schema.number().default(6).description("多次起床间隔 (小时)"),
    superGetUpEnable: Schema.boolean().default(false).description("超级起床功能开关"),
    superGetUpInterval: Schema.number().default(1).description("超级起床间隔 (小时)"),
    nightEnable: Schema.boolean().default(true).description("晚安时段功能开关"),
    nightStartHour: Schema.number().default(21).description("晚安时段最早时间 (小时)"),
    nightEndHour: Schema.number().default(6).description("晚安时段最晚时间 (小时)"),
    goodSleepEnable: Schema.boolean().default(true).description("好梦功能开关"),
    goodSleepInterval: Schema.number().default(6).description("好梦间隔 (小时)"),
    deepSleepEnable: Schema.boolean().default(false).description("深度睡眠功能开关"),
    deepSleepInterval: Schema.number().default(3).description("深度睡眠间隔 (小时)"),
    MORNING_MESSAGES: Schema.array(Schema.string())
        .default(["早安", "早哇", "起床", "早上好", "ohayo", "哦哈哟", "お早う", "good morning"])
        .description("触发早安的关键词"),
    NIGHT_MESSAGES: Schema.array(Schema.string())
        .default(["晚安", "睡觉", "睡了", "晚安哇", "good night", "おやすみ", "お休みなさい"])
        .description("触发晚安的关键词"),
    morningPrompts: Schema.array(Schema.string())
        .default([
            "元气满满的一天开始啦！ (/▽＼)",
            "迎接美好的一天吧！ (￣▽￣)~*",
            "今天也要干劲满满哦~ (๑•̀ㅂ•́)و✧",
            "今天也要加油哦！ (ง •_•)ง"
        ])
        .description("早安提示语"),
    nightPrompts: Schema.array(Schema.string())
        .default([
            "很累了罢~(。-ω-)zzz",
            "祝你有个好梦～(￣o￣) . z Z",
            "晚安(∪｡∪)｡｡｡zzz",
            "おやすみなさい～(´-ω-)`~*",
            "睡个好觉哦(˘ω˘)ｽﾞﾔｧ…"
        ])
        .description("晚安提示语")
});

export async function apply(ctx: Context, config: Config) {
    applyModel(ctx);
    await applycron(ctx, config);
    ctx.on("message", async (session) => {
        if (!session || !session.content) {
            return;
        }
        if (session.guildId) {
            const targetChannels = await ctx.database.get("channel", {
                id: session.guildId,
                platform: session.platform
            });
            if (targetChannels.length === 0) {
                return;
            }
            if (targetChannels[0].assignee !== session.selfId) {
                return;
            }
        }
        if (config.MORNING_MESSAGES.some((msg) => session.content?.startsWith(msg)) || session.content === "早") {
            await session.execute("morning");
        } else if (config.NIGHT_MESSAGES.some((msg) => session.content?.startsWith(msg)) || session.content === "晚") {
            await session.execute("night");
        }
    });

    ctx.command("morning", "早安消息打卡").action(async ({ session }) => {
        if (!session || !session.content) {
            return;
        }
        if (session.guildId && session.userId) {
            await session.send(await get_morning(ctx, config, session.userId, session.guildId));
        } else {
            // TODO: 添加私聊的处理逻辑
            await session.send("私聊早晚安还在开发中，去群里试试吧～");
        }
    });

    ctx.command("night", "晚安消息打卡").action(async ({ session }) => {
        if (!session || !session.content) {
            return;
        }
        if (session.guildId && session.userId) {
            await session.send(await get_night(ctx, config, session.userId, session.guildId));
        } else {
            // TODO: 添加私聊的处理逻辑
            await session.send("私聊早晚安还在开发中，去群里试试吧～");
        }
    });

    ctx.command("早晚安统计", "查看早晚安统计信息").action(async ({ session }) => {
        if (!session) {
            throw new Error("无法获取会话信息");
        }
        if (session.guildId && session.userId) {
            const result = await get_all_morning_night_data(ctx, session.guildId);
            const today = moment().tz(config.timezone).format("YYYY年MM月DD日");
            return (
                `✨ 今日睡眠统计 (${today}) ✨\n` +
                `╔═══════════\n` +
                `║ 全服统计:\n` +
                `║  早安次数: ${result.morning_count.toString().padStart(6)}\n` +
                `║  晚安次数: ${result.night_count.toString().padStart(6)}\n` +
                `║  正在睡觉: ${result.sleeping_count.toString().padStart(6)}\n` +
                `║  已经起床: ${result.getting_up_count.toString().padStart(6)}\n` +
                `╠═══════════\n` +
                `║ 本群统计:\n` +
                `║  早安次数: ${result.group_morning_count.toString().padStart(6)}\n` +
                `║  晚安次数: ${result.group_night_count.toString().padStart(6)}\n` +
                `║  早安占比: ${(result.morning_percent * 100).toFixed(2).padStart(6)}%\n` +
                `║  晚安占比: ${(result.night_percent * 100).toFixed(2).padStart(6)}%\n` +
                `╚═══════════`
            );
        } else {
            return "只能在群聊中使用早晚安统计哦～";
        }
    });

    // TODO: 我的作息
}
