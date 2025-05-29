import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const TEAMWORK_API_KEY = process.env.TEAMWORK_API_KEY;
const DESK_API_KEY = process.env.DESK_API_KEY;
const TEAMWORK_BASE_URL = process.env.TEAMWORK_BASE_URL;
const BUG_SCORES = {
  LEVEL_0: {
    HIGH: 10,
    MEDIUM: 10,
    LOW: 10,
  },
  LEVEL_1: {
    HIGH: 10,
    MEDIUM: 10,
    LOW: 10,
  },
  LEVEL_2: {
    HIGH: 5,
    MEDIUM: 4,
    LOW: 3,
  },
  LEVEL_3: {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  },
  LEVEL_4: {
    HIGH: 1,
    MEDIUM: 1,
    LOW: 1,
  },
};

async function makeTeamworkAPICall(url) {
  try {
    console.log("Making API call to:", url);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${btoa(`${TEAMWORK_API_KEY}:xxx`)}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status} error from ${url}: ${errorText}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`❌ API call failed: ${url}`, err);
    throw err; // rethrow so caller knows it failed
  }
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

export async function getEnrichedTasks({ taskListID, apiParams = {} }) {
  const taskData = await getTeamworkTasks({ taskListID, apiParams });
  const customFieldsByTask = groupCustomFieldsByTaskId(taskData.included);
  const tasksWithTicketCounts = await addDeskTicketCounts(taskData.tasks);

  return tasksWithTicketCounts.map((task) => {
    const taskImpact = customFieldsByTask[task.id]?.find(
      (field) => field.name.toLowerCase() === "impact"
    )?.value;
    const taskProductArea = customFieldsByTask[task.id]?.find(
      (field) => field.name.toLowerCase() === "product area"
    )?.value;
    const bugScore = calculateBugScore({
      impact: taskImpact,
      priority: task.priority,
      ticketCount: task.ticketCount,
    });
    return {
      name: task.name,
      id: task.id,
      createdAt: task.createdAt,
      priority: task.priority,
      hasDeskTickets: task.hasDeskTickets,
      ticketCount: task.ticketCount,
      customFields: customFieldsByTask[task.id] || [],
      impact: taskImpact,
      productArea: taskProductArea,
      bugScore: bugScore,
    };
  });
}

function groupCustomFieldsByTaskId(included) {
  if (!included.customfields) return {};
  if (!included.customfieldTasks) return {};

  console.log("included.customfields is %s", included.customfields);
  console.log("included.customfieldsTasks is %s", included.customfieldsTasks);

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

function toUpperSnakeCase(input) {
  if (!input) return "";
  // Split the input string into words
  var words = input.trim().split(/\s+/);

  // Capitalize each word and join with underscores
  var upperSnakeCase = words
    .map(function (word) {
      return word.toUpperCase();
    })
    .join("_");

  return upperSnakeCase;
}

export function calculateBugScore({
  impact = "LEVEL_3",
  priority = "medium",
  ticketCount = 0,
}) {
  const levelConst = toUpperSnakeCase(impact);
  const priorityConst = toUpperSnakeCase(priority);
  const defaultScore = 2; // Default score if no match is found
  const initialScore = BUG_SCORES[levelConst]?.[priorityConst] ?? defaultScore;

  const finalScore = initialScore + ticketCount;
  console.log("finalScore is %s", finalScore);
  return finalScore;
}

export async function sendChatMessage(message, url) {
  const data = {
    body: message,
  };
  const headers = {
    "Content-type": "application/json",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(data),
      headers: headers,
    });

    const text = await response.text(); // Read response as text to handle both success and error cases

    if (!response.ok) {
      console.error(
        `❌ Failed to send chat message. Status: ${response.status}, Response: ${text}`
      );
      throw new Error(
        `Failed to send chat message. Status: ${response.status}`
      );
    }

    console.log("✅ Message sent successfully:", data);

    try {
      const responseData = JSON.parse(text);
      return responseData;
    } catch (parseError) {
      console.warn("⚠️ Could not parse response as JSON:", parseError.message);
      return text;
    }
  } catch (error) {
    console.error("❌ Error sending message:", error);
    throw error;
  }
}
