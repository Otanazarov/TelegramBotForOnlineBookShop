import {
  Conversation,
  ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import { Bot, Composer, Context, InlineKeyboard, session } from "grammy";
type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;
export const registerHandler = new Composer<MyContext>();
registerHandler.use(session({ initial: () => ({}) }));
registerHandler.use(conversations());
async function movie(conversation: MyConversation, ctx: MyContext) {
  const tgID = await ctx.from?.id;

  const options = {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  };
  const req = await fetch(`http://localhost:3000/auth/${tgID}`, options);
  const res = await req.json();
  console.log(res);

  if (res.message) {
    ctx.reply(`Registratsiya bo'lgansiz ❌`);
    return;
  }
  ctx.reply(`Emailingizni yuboring`);
  const email = await conversation.form.text();

  ctx.reply(`Parolingizni yuboring`);
  const password = await conversation.form.text();
  try {
    const payload = {
      email: `${email}`,
      password: `${password}`,
      telegramUserID: `${tgID}`,
    };
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
    console.log(options);

    const req = await fetch("http://localhost:3000/auth/login", options);
    const res = await req.json();

    if (res.error) {
      ctx.reply("Email yoki Parol xato ❌");
    } else {
      ctx.reply(res.answer);
    }
  } catch (error) {
    console.error("Xatolik yuz berdi:", error);
  }
}

registerHandler.use(createConversation(movie, { id: "movie" }));

registerHandler.command("registratsiya", async (ctx: MyContext) => {
  await ctx.conversation.enter("movie");
});
function stringToNumber(){
  
}