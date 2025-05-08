import fetch from "node-fetch";
import dotenv from "dotenv";
import { getTasksWithCustomFieldsAndTicketCounts } from "./lib/teamwork.js";
dotenv.config();

const TEAMWORK_CHAT_URL = process.env.TEAMWORK_CHAT_URL;
const TEAMWORK_API_KEY = process.env.TEAMWORK_API_KEY;
const DESK_API_KEY = process.env.DESK_API_KEY;
const TEAMWORK_BASE_URL = process.env.TEAMWORK_BASE_URL;
const TEAMWORK_TASKLIST_ID = process.env.TEAMWORK_TASKLIST_ID;

const minTaskAgeInDays = 90;
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
};

function getDateInPast(daysAgo) {
  const newDate = new Date();
  newDate.setDate(newDate.getDate() - daysAgo);
  return newDate.toISOString();
}

function generateTasksMarkdownTable(tasks) {
  // loop through the tasks and create a table
  const headers = [
    "Name",
    "Date Created",
    "Product Area",
    "Impact",
    "Priority",
    "Desk Tickets",
  ];
  const separator = ["---", "---", "---", "---", "---", "---"];

  const rows = tasks.map((task) => {
    return [
      `[${task.name}](${TEAMWORK_BASE_URL}/app/tasks/${task.id})`,
      new Date(task.createdAt).toLocaleDateString("en-IE"),
      task.productArea || "-",
      task.impact || "-",
      formatPriority(task.priority),
      task.ticketCount || "-",
    ];
  });

  const table = [headers, separator, ...rows]
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");

  return table;
}

function formatPriority(priority) {
  if (!priority) {
    return "No Priority";
  }

  const priorityMap = {
    high: ":heart: High",
    medium: ":yellow_heart: Medium",
    low: ":green_heart: Low",
  };

  if (priorityMap[priority]) {
    return priorityMap[priority];
  }

  return "";
}

function sendChatMessage(message, url) {
  const data = {
    body: message,
  };
  const headers = {
    "Content-type": "application/json",
  };

  return fetch(url, {
    method: "post",
    body: JSON.stringify(data),
    headers: headers,
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Message sent successfully:", data);
    })
    .catch((error) => {
      console.error("Error sending message:", error);
    });
}

// Main function to fetch tasks and send to Slack
(async () => {
  // Fetch tasks from Teamwork
  const tasks = await getTasksWithCustomFieldsAndTicketCounts({
    taskListID: TEAMWORK_TASKLIST_ID,
    apiParams: apiParams,
  });

  //console.log("Normalized tasks:", normailizedTasks);

  const message = `:radioactive_sign: @online here are the **Tasks Over ${minTaskAgeInDays} Days Old:** \n \n \n ${generateTasksMarkdownTable(
    tasks
  )}`;

  console.log(message);
  // Send the message to Chat
  //await sendChatMessage(message, TEAMWORK_CHAT_URL);
  //console.log("Chat message sent.");
})();
