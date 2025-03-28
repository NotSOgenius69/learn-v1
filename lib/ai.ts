// lib/ai.ts
import axios from "axios";
import { RoadmapNode } from "@/types";

const invalidKeywords = [
  "weather", 
  "score",
  "news",
  "today",
  "current",
  "calculate",
  "what is",
  "who is",
  "where is",
  "when is",
  "why is",
  "how to fix",
  "debug",
  "error",
  "problem"
];

// Simplify the validation function
const validatePrompt = (prompt: string): boolean => {
  const lowerCasePrompt = prompt.toLowerCase().trim();
  
  // Check minimum length
  if (lowerCasePrompt.length < 3) {
    throw new Error("Please enter a longer topic description.");
  }

  // Check maximum length
  if (lowerCasePrompt.length > 200) {
    throw new Error("Please enter a shorter topic description.");
  }

  // Check for invalid keywords - only block obviously non-educational queries
  const matchedKeyword = invalidKeywords.find(keyword => lowerCasePrompt.includes(keyword));
  if (matchedKeyword) {
    throw new Error(`Please enter a topic you want to learn about, rather than a question or problem.`);
  }

  return true;
};

export const generateRoadmap = async (
  prompt: string,
  level: "beginner" | "intermediate" | "advanced",
  roadmapType: "week-by-week" | "topic-wise"
) => {
  console.log("Starting AI generation with:", { prompt, level, roadmapType });

  try {
    // Validate prompt before making API request
    validatePrompt(prompt);

    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured in environment variables");
    }

    const roadmapPrompt = `
As an expert JSON generator for learning roadmaps, create a valid JSON object with a nodes array for a "${prompt}" learning roadmap.

RESPONSE FORMAT:
{
  "nodes": [
    {
      "id": "node_1",
      "title": "1. First Topic",
      "description": ["Point 1", "Point 2", "Point 3"],
      "children": ["node_2", "node_3"],
      "sequence": 1,
      "timeNeeded": 4
    }
  ]
}

REQUIREMENTS:
- ALL nodes must have: id, title, description (array), children (array), sequence (number), timeNeeded (hours)
- id format: "node_X" where X is a number
- title format: must start with sequence number (e.g., "1. Introduction")
- For ${level} level: create ${level === "beginner" ? "8-10" : level === "intermediate" ? "11-15" : "15-18"} nodes
- Ensure proper progression from fundamentals to advanced topics
- Maximum 2 child nodes per parent
- For time allocation: beginner (1-4h), intermediate (2-6h), advanced (4-10h)

Generate a complete, coherent roadmap for learning ${prompt} at a ${level} level.`;

    // Update the system message to be more strict
    const systemMessage = `You are a JSON generator API that ONLY outputs valid JSON objects. 
CRITICAL: Your entire response must be a properly formatted JSON object with the structure {"nodes": [...]}.
Do not include ANY explanation text, markdown formatting, or code blocks.
Only the raw JSON is allowed in your response.`;

    console.log("Making request to Groq API");
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "mistral-saba-24b",
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: roadmapPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 0.9,
        frequency_penalty: 0.2,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        timeout: 30000
      }
    );

    console.log("Received response from Groq API");

    if (!response.data?.choices?.[0]?.message?.content) {
      console.error("Invalid API response:", response.data);
      throw new Error("Invalid response from Groq API");
    }

    const text = response.data.choices[0].message.content.trim();
    console.log("Raw AI response length:", text.length);
    
    // Log the first and last part of the response for debugging
    console.log("Response preview:", 
      text.substring(0, 100) + "..." + 
      text.substring(text.length - 100)
    );

    let parsedResponse;
    try {
      // First try to parse the raw response
      parsedResponse = JSON.parse(text);
    } catch (e: any) {
      console.error("JSON parse error:", e);
      
      // If direct parsing fails, try to extract JSON from the text
      // This handles cases where the model adds explanatory text
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0];
          console.log("Attempting to parse extracted JSON");
          parsedResponse = JSON.parse(extractedJson);
        } else {
          throw new Error("Could not extract valid JSON from response");
        }
      } catch (extractError) {
        console.error("Failed to extract and parse JSON:", extractError);
        throw new Error("Failed to parse JSON response: " + e.message);
      }
    }

    // Ensure we have a nodes array
    if (!parsedResponse || !parsedResponse.nodes || !Array.isArray(parsedResponse.nodes)) {
      console.error("Invalid response structure:", parsedResponse);
      throw new Error("Invalid response format: missing nodes array");
    }

    if (parsedResponse.nodes.length === 0) {
      throw new Error("Received empty nodes array from AI service");
    }

    const roadmap = parsedResponse.nodes;

    // Process and validate each node
    const processedNodes: RoadmapNode[] = roadmap.map((node: any, index: number) => {
      try {
        // Ensure all required fields exist with default values if needed
        const processedNode = {
          id: node.id || `node_${index + 1}`,
          title: node.title || `${index + 1}. Untitled Node`,
          description: Array.isArray(node.description) ? node.description : [],
          children: Array.isArray(node.children) ? node.children : [],
          sequence: typeof node.sequence === 'number' ? node.sequence : index + 1,
          timeNeeded: typeof node.timeNeeded === 'number' ? node.timeNeeded : 0,
          completed: false,
          timeConsumed: 0,
          position: calculateNodePosition(index, roadmap.length)
        };

        // Validate the processed node
        if (!processedNode.title.match(/^\d+\./)) {
          processedNode.title = `${processedNode.sequence}. ${processedNode.title.replace(/^\d+\.\s*/, '')}`;
        }

        if (processedNode.description.length === 0) {
          processedNode.description = ["No description available"];
        }

        // Ensure children array contains valid node IDs
        processedNode.children = processedNode.children.filter((childId: string) => 
          roadmap.some((n: RoadmapNode) => n.id === childId)
        );

        return processedNode;
      } catch (e) {
        console.error(`Error processing node at position ${index + 1}:`, e);
        // Return a valid default node instead of throwing
        return {
          id: `node_${index + 1}`,
          title: `${index + 1}. Topic ${index + 1}`,
          description: ["Content to be added"],
          children: [],
          sequence: index + 1,
          timeNeeded: 1,
          completed: false,
          timeConsumed: 0,
          position: calculateNodePosition(index, roadmap.length)
        };
      }
    });

    // Sort by sequence and fix any sequence gaps
    processedNodes.sort((a, b) => a.sequence - b.sequence);
    processedNodes.forEach((node, index) => {
      node.sequence = index + 1;
      node.title = `${index + 1}. ${node.title.replace(/^\d+\.\s*/, '')}`;
    });

    return processedNodes;
  } catch (error: any) {
    // Enhanced error handling
    const errorMessage = error.message || "Failed to generate roadmap";
    
    // Log error for debugging
    console.error("Roadmap generation error:", {
      message: errorMessage,
      prompt,
      level,
      roadmapType,
      response: error.response?.data,
      status: error.response?.status
    });

    // Handle Groq API specific errors
    if (error.response?.status === 400) {
      // Check if it's a model issue or a parameter issue
      const errorData = error.response.data;
      console.error("Groq API 400 error details:", errorData);
      
      // Create fallback nodes for testing/debug
      if (process.env.NODE_ENV === 'development') {
        console.log("Creating fallback nodes for development environment");
        const fallbackNodes = createFallbackNodes(prompt, level);
        return fallbackNodes;
      }
      
      throw new Error("The AI service couldn't process this request. Please try again with different parameters.");
    }

    // Throw a user-friendly error
    throw new Error(
      error.response?.status === 401 ? "Authentication failed" :
      error.response?.status === 429 ? "Too many requests. Please try again later." :
      errorMessage
    );
  }
};

// Function to create fallback nodes for development/testing
function createFallbackNodes(prompt: string, level: string): RoadmapNode[] {
  const nodeCount = level === "beginner" ? 8 : level === "intermediate" ? 12 : 15;
  const nodes: RoadmapNode[] = [];
  
  for (let i = 0; i < nodeCount; i++) {
    const node: RoadmapNode = {
      id: `node_${i + 1}`,
      title: `${i + 1}. ${prompt} Topic ${i + 1}`,
      description: [
        `Learn the basics of ${prompt} concept ${i + 1}`,
        `Key areas: Theory, Practice, Application`,
        `Complete exercises related to ${prompt} topic ${i + 1}`
      ],
      children: i < nodeCount - 2 ? [`node_${i + 2}`, `node_${i + 3}`].filter(n => n.split('_')[1] <= nodeCount.toString()) : [],
      sequence: i + 1,
      timeNeeded: Math.floor(Math.random() * 5) + 1,
      timeConsumed: 0,
      completed: false,
      position: calculateNodePosition(i, nodeCount)
    };
    nodes.push(node);
  }
  
  return nodes;
}

function calculateNodePosition(index: number, total: number) {
  // Tree layout configuration
  const VERTICAL_SPACING = 100;     // Increased for more vertical space
  const MIN_NODE_SPACING = 140;     // Increased for more horizontal space
  const TOP_MARGIN = 50;
  const LEVEL_PADDING = 50;         // Increased padding between subtrees
  
  // Calculate the level (depth) of the node in the tree
  const level = Math.floor(Math.log2(index + 1));
  
  // Calculate position in current level
  const positionInLevel = index - (Math.pow(2, level) - 1);
  
  // Calculate total nodes at this level
  const nodesInLevel = Math.min(Math.pow(2, level), total - (Math.pow(2, level) - 1));
  
  // Base width calculation
  const baseWidth = MIN_NODE_SPACING * Math.pow(2, level);
  
  // Calculate x position
  // This ensures nodes spread out more as we go deeper in the tree
  const xSpacing = baseWidth / (nodesInLevel + 1);
  let x = (positionInLevel + 1) * xSpacing - (baseWidth / 2);
  
  // Add spacing between left and right subtrees
  if (level > 0) {
    const isRightSubtree = positionInLevel >= nodesInLevel / 2;
    const spreadFactor = Math.pow(1.5, level); // Increase spread for deeper levels
    x += isRightSubtree ? 
      LEVEL_PADDING * spreadFactor : 
      -LEVEL_PADDING * spreadFactor;
  }
  
  // Calculate y position with fixed spacing
  const y = level * VERTICAL_SPACING + TOP_MARGIN;

  return { x, y };
}
