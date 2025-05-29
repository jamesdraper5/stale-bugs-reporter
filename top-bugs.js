import fetch from "node-fetch";
import dotenv from "dotenv";
import { getEnrichedTasks, sendChatMessage } from "./lib/teamwork.js";
import {
  generateMarkdownTable,
  getDateInPast,
  formatPriority,
} from "./utils.js";
dotenv.config();

const CORE_CHANNEL_URL = process.env.CORE_CHANNEL_URL;
const TEAMWORK_BASE_URL = process.env.TEAMWORK_BASE_URL;
const TEAMWORK_TASKLIST_ID = process.env.TEAMWORK_TASKLIST_ID;

console.log("CORE_CHANNEL_URL", CORE_CHANNEL_URL);

const minTaskAgeInDays = 0;
const assigneeTeamId = 9; // My Team

const apiParams = {
  createdBefore: getDateInPast(minTaskAgeInDays),
  assigneeTeamIds: assigneeTeamId,
  skipCounts: false,
  includeCommentStats: true,
  includeCompanyUserIds: true,
  includeCustomFields: true,
  getSubTasks: true,
  createdFilter: "custom",
  orderBy: "createdAt",
  orderMode: "asc",
  limit: 100,
  pageSize: 100,
};

function generateTasksTable(tasks) {
  // loop through the tasks and create a table
  const headers = [
    "Name",
    "Date Created",
    "Product Area",
    "Impact",
    "Priority",
    "Desk Tickets",
    "Bug Score",
  ];

  const rows = tasks
    .sort((a, b) => (b.bugScore ?? 0) - (a.bugScore ?? 0)) // Sort tasks by bugScore descending
    .slice(0, 10) // Limit to top 10 tasks
    .map((task) => {
      console.log("Task:", task);
      return [
        `[${task.name}](${TEAMWORK_BASE_URL}/app/tasks/${task.id})`,
        new Date(task.createdAt).toLocaleDateString("en-IE"),
        task.productArea || "-",
        task.impact || "-",
        formatPriority(task.priority),
        task.ticketCount || "-",
        task.bugScore || "-",
      ];
    });

  return generateMarkdownTable({ headers, rows });
}

// Main function to fetch tasks and send to Slack
(async () => {
  // Fetch tasks from Teamwork
  const tasks = await getEnrichedTasks({
    taskListID: TEAMWORK_TASKLIST_ID,
    apiParams: apiParams,
  });

  //console.log("Normalized tasks:", normailizedTasks);

  const message = `:radioactive_sign: @online here are the **Top Ten Open Bugs:** \n \n \n ${generateTasksTable(
    tasks
  )}`;
  console.log(message);

  // Send the message to Chat
  await sendChatMessage(message, CORE_CHANNEL_URL);
  console.log("Chat message sent.");
})();
