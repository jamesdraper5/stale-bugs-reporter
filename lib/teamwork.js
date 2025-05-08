import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const TEAMWORK_API_KEY = process.env.TEAMWORK_API_KEY;
const DESK_API_KEY = process.env.DESK_API_KEY;
const TEAMWORK_BASE_URL = process.env.TEAMWORK_BASE_URL;

async function makeTeamworkAPICall(url) {
  console.log("Making API call to:", url);
  const res = await fetch(url, {
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
  return data;
}

export async function getTeamworkTasks({ taskListID, apiParams = {} }) {
  let endpoint = `${TEAMWORK_BASE_URL}/projects/api/v3/`;
  endpoint += taskListID ? `tasklists/${taskListID}/tasks.json` : `tasks.json`;

  if (apiParams) {
    endpoint += `?${new URLSearchParams(apiParams)}`;
  }

  const data = await makeTeamworkAPICall(endpoint);
  return data;
}

export async function getTasksWithCustomFieldsAndTicketCounts({
  taskListID,
  apiParams = {},
}) {
  const taskData = await getTeamworkTasks({ taskListID, apiParams });
  const customFieldsByTask = groupCustomFieldsByTaskId(taskData.included);
  const tasksWithTicketCounts = await addDeskTicketCounts(taskData.tasks);
  return tasksWithTicketCounts.map((task) => {
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
        (field) => field.name.toLowerCase() === "product area"
      )?.value,
    };
  });
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

export function sendChatMessage(message, url) {
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
