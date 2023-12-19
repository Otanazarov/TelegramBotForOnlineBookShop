import {
  Conversation,
  ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import { Bot, Context, InlineKeyboard, InputFile, session } from "grammy";
import { json } from "stream/consumers";
import { registerHandler } from "./handler/registerHandler";
import { Menu } from "@grammyjs/menu";
import axios from "axios";
import { log } from "console";
import { createReadStream } from "fs";
type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;
const bot = new Bot<MyContext>(
  "6819283429:AAFzBAGUMBXDMxxwxW1hgmTtKiX99VNK_-0"
);
bot.use(registerHandler);
// const menu = new Menu("my-menu-identifier")
//   .text("", (ctx) => ctx.reply("You pressed A!")).row()
//   .text("B", (ctx) => ctx.reply("You pressed B!"));

// // Make it interactive.
// bot.use(menu);

bot.command("start", (ctx) =>
  ctx.reply(
    "Salom botga xush kelibsiz 👋🏿\nBotni ishlatish uchun registratsiyadan o'ting 📋\n/registratsiya "
  )
);
bot.command("me", async (ctx) => {
  const id = ctx.from?.id;

  const options1 = {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  };
  const req1 = await fetch(`http://localhost:3000/user/${id}`, options1);
  const res1 = await req1.json();
  const dbID = res1.data.id;

  const options = {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  };
  const req = await fetch(`http://localhost:3000/saved/${dbID}`, options);
  const res = await req.json();
  for (let name of res) {
    ctx.reply(`Kitob:${name.name} 📖\nNarx:${name.price} 💵`);
  }
});

bot.callbackQuery(/^book_/, async (ctx) => {
  const book = +ctx.callbackQuery.data.replace("book_", "");
  const options = {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  };
  const req = await fetch(`http://localhost:3000/book/${book}`, options);
  const res = await req.json();
  console.log(res);

  const bookName = res.data.bookName;
  const price = res.data.price;
  const desc = res.data.desc;
  const inlineKeyboard = new InlineKeyboard();
  inlineKeyboard.text(`Sotib olish 💳`, `sotish_${book}`);
  inlineKeyboard.text(`Save ➕`, `save_${book}`);
  ctx.reply(`Nomi: ${bookName}\nNarxi: ${price}\nHaqida: ${desc}\n`, {
    reply_markup: inlineKeyboard,
  });
});

bot.callbackQuery(/^sotish_/, async (ctx) => {
  const book = +ctx.callbackQuery.data.replace("sotish_", "");
  console.log(book);

  const options = {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  };
  const req = await fetch(`http://localhost:3000/book/${book}`, options);
  const res = await req.json();
  console.log(res);

  const pdf = res.data.pdf;
  const pdfFile = new InputFile(pdf);

  try {
    await ctx.replyWithDocument(pdfFile, { caption: "Here is the PDF file." });
  } catch (error) {
    ctx.reply(`Bunday kitop hali sotuvda yoq ❌`);
    console.error("Error sending PDF:", error);
  }
  ctx.reply(
    `Plastik kartichkaga pul o'tkazilgandan so'ng siz pdf faylni tashlaymiz ✅📑\n To'lov chekini yubaring 🧾`
  );
  const a = new InputFile("./PDF/clean.pdf");
  await ctx.replyWithDocument(a, { caption: "Mana sizning faylingiz" });
});
bot.callbackQuery(/^save_/, async (ctx) => {
  const tgID = await ctx.from?.id;
  const bookID = +ctx.callbackQuery.data.replace("save_", "");
  const options1 = {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  };
  try {
    const req1 = await fetch(`http://localhost:3000/auth/${tgID}`, options1);
    const res1 = await req1.json();
    const payload = {
      userID: +res1.error,
      bookID: bookID,
    };
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
    const req = await fetch("http://localhost:3000/saved", options);
    const res = await req.json();
  } catch (error) {
    ctx.answerCallbackQuery("Save qilingan");
  }
});
bot.command("category", async (ctx) => {
  const inlineKeyboard = new InlineKeyboard();
  let num = 0;
  let num2 = 0;
  const options = {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  };
  
  const req = await fetch(`http://localhost:3000/category`, options);
  const res = (await req.json()).data;
  const category = [];
  for (let categoryName of res) {
    inlineKeyboard.text(`${(num += 1)}`, `category_${categoryName.id}`);
    category.push(`${(num2 += 1)}.${categoryName.categoryName}\n`);
  }
  inlineKeyboard.row().text("⬅️").text("1").text("➡️", "categories_2");
  ctx.reply(category.join(""), { reply_markup: inlineKeyboard });
});
bot.callbackQuery(/^categories_/, async (ctx) => {
  let num = 0;
  const inlineKeyboard = new InlineKeyboard();
  const page = +ctx.callbackQuery.data.replace("categories_", "");
  const category = (
    await axios.get("http://localhost:3000/category", {
      params: { page },
    })
  ).data.data;
  console.log(page, category.length);
  if (category.length == 0) {
    ctx.answerCallbackQuery(`category not found`);
    return;
  }
  for (let categoryName of category) {
    inlineKeyboard.text(`${(num += 1)}`, `category_${categoryName.id}`);
  }
  inlineKeyboard
    .row()
    .text("⬅️", `categories_${page - 1}`)
    .text(page + "")
    .text("➡️", `categories_${page + 1}`);
  console.log(category);

  ctx.editMessageText(
    category
      .map((v: any, i: number) => i + 1 + ". " + v.categoryName + "\n")
      .join(""),
    { reply_markup: inlineKeyboard }
  );
});
bot.callbackQuery(/^category_/, async (ctx) => {
  let num = 0;
  const inlineKeyboard = new InlineKeyboard();
  const a = +ctx.callbackQuery.data.replace("category_", "");
  const options = {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  };
  const req = await fetch(`http://localhost:3000/category/${a}`, options);
  const res = await req.json();
  for (let book of res) {
    inlineKeyboard.text(`${(num += 1)}`, `book_${book.id}`);
  }
  ctx.reply(
    res
      .map(
        (v: any, i: number) =>
          i + 1 + `. Nomi: ${v.name}\n Narxi: ${v.price}\n Haqida: ${v.desc} \n`
      )
      .join(""),
    { reply_markup: inlineKeyboard }
  );
  // for (let name of res) {
  //   var id =name.id
  //   ctx.reply(`Kitob:${name.name} 📖\nNarx:${name.price} 💵`, {
  //     reply_markup: inlineKeyboard,
  //   });
  // }
});
bot.on("message", async (ctx) => {
  const message = ctx.message.text;

  const options1 = {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  };
  const req1 = await fetch(
    `http://localhost:3000/book/search/${message}`,
    options1
  );
  const res1 = await req1.json();
  const a = res1.data.map((b: any) => ({
    bookName: b.bookName,
    price: b.price,
  }));
  for (let name of a) {
    ctx.reply(`Kitob:${name.bookName} 📖\nNarx:${name.price} 💵`);
  }
});

bot.start({ drop_pending_updates: true });
