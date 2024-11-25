import * as cron from 'node-cron';
import sendDueReminders from "../utility/sendDueReminders";

cron.schedule("* * * * *", async () => {
    // console.log("S")
  await sendDueReminders();
});