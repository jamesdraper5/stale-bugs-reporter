import fetch from "node-fetch";

const TEAMWORK_CHAT_URL = process.env.TEAMWORK_CHAT_URL;
const TEAMWORK_API_KEY = process.env.TEAMWORK_API_KEY;
const DESK_API_KEY = process.env.DESK_API_KEY;
const TEAMWORK_BASE_URL = process.env.TEAMWORK_BASE_URL;
const TEAMWORK_TASKLIST_ID = process.env.TEAMWORK_TASKLIST_ID;

const apiEndpoint = `${TEAMWORK_BASE_URL}/projects/api/v3/tasklists/${TEAMWORK_TASKLIST_ID}/tasks.json`;
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

const endpoint = `${apiEndpoint}?${new URLSearchParams(apiParams)}`;

function getDateInPast(daysAgo) {
  const newDate = new Date();
  newDate.setDate(newDate.getDate() - daysAgo);
  return newDate.toISOString(); //.replace('.000Z', '+00:00');
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
      new Date(task.createdAt).toLocaleDateString(),
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

function groupCustomFieldsByTaskId(included) {
  if (!included.customfields) return {};
  if (!included.customfieldTasks) return {};

  //console.log("included.customfields is %s", included.customfields);

  const customFieldsPerTask = {};
  Object.values(included.customfieldTasks).forEach((item) => {
    if (!customFieldsPerTask[item.taskId]) {
      customFieldsPerTask[item.taskId] = [];
    }
    customFieldsPerTask[item.taskId].push({
      id: item.customfieldId,
      name: included.customfields[item.customfieldId]?.name,
      value: item.value,
    });
  });
  return customFieldsPerTask;
}

async function addDeskTicketCounts(tasks) {
  const BATCH_SIZE = 5;
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const enrichedTasks = [];

  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE);

    const enrichedBatch = await Promise.all(
      batch.map(async (task) => {
        if (!task.hasDeskTickets) {
          return { ...task, ticketCount: 0 };
        }

        try {
          const ticketRes = await fetch(
            `${TEAMWORK_BASE_URL}/desk/api/v2/search/tickets.json?task=${task.id}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${DESK_API_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );
          const ticketData = await ticketRes.json();
          const ticketCount = ticketData?.pagination?.records ?? 0;
          console.log(`Ticket count for task ${task.id}:`, ticketCount);
          return { ...task, ticketCount };
        } catch (err) {
          console.error(`❌ Error on task ${task.id}:`, err.message);
          return { ...task, ticketCount: null };
        }
      })
    );
    enrichedTasks.push(...enrichedBatch);

    // Optional delay between batches (very gentle on the API)
    await delay(500); // 5 requests every 0.5s = 10 per second
  }
  return enrichedTasks;
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
  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Basic ${btoa(`${TEAMWORK_API_KEY}:xxx`)}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }

  const data = await res.json();

  // console.log("Data fetched successfully:", data);

  const customFieldsByTask = groupCustomFieldsByTaskId(data.included);
  //console.log("Custom fields by task:", customFieldsByTask);

  const tasksWithTicketCounts = await addDeskTicketCounts(data.tasks);
  //console.log("Tasks with ticket counts:", tasksWithTicketCounts);

  const normailizedTasks = tasksWithTicketCounts.map((task) => {
    return {
      name: task.name,
      id: task.id,
      createdAt: task.createdAt,
      priority: task.priority,
      hasDeskTickets: task.hasDeskTickets,
      ticketCount: task.ticketCount,
      customFields: customFieldsByTask[task.id] || [],
      impact: customFieldsByTask[task.id].find(
        (field) => field.name.toLowerCase() === "impact"
      )?.value,
      productArea: customFieldsByTask[task.id].find(
        (field) => field.toLowerCase() === "product area"
      )?.value,
    };
  });

  //console.log("Normalized tasks:", normailizedTasks);

  const message = `**:radioactive_sign: Tasks Over ${minTaskAgeInDays} Days Old:** \n \n \n ${generateTasksMarkdownTable(
    normailizedTasks
  )}`;

  console.log(message);
  // Send the message to Chat
  await sendChatMessage(message, TEAMWORK_CHAT_URL);
  //console.log("Chat message sent.");
})();
