import { generateDummyPassword } from "./db/utils";

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();

export const suggestions = [
  "What is the Original Budget on the Tower Project?",
  "What are the budget changes approved for the Tower Project?",
  "Which project had the most changes in the Budget?",
  "Which project has the maximum budget change amount?",
  "List the budget changes and count in the Tower Project.",
  "What is the total amount of budget on the Tower Project?",
  "Which budget line item has been changed the most?",
  "Which budget line items have the maximum budget change amount?",
  "What was the approved budget amount for FF&E?",
  "Predict the chances of finishing Project Tower within the budget.",
  "Give me the 5 areas where we are most over budget.",
  "Give me the 5 areas where we are most under budget.",
  "Give me the original contract amount for Tower Projects.",
  "Give me commitment changes for Tower Projects.",
  "Which commitment change (Vendor Contract) is impacting project Tower?",
  "Which commitment change is impacting the project Tower?",
  "Give me commitment changes for Kohn Pedersen Fox Associates (KOHN11).",
  "Give me the current contract value for Tower projects.",
  "Give me a list of soft cost vendors.",
  "What are the soft cost vendors for the Tower Project?",
  "Which vendors have we had the most change orders with?",
  "Is there a vendor that has consistently come in under budget?",
  "Which vendors have issued the highest number of change orders?",
  "Which vendors have issued the highest total amount of change orders?",
  "What is the total value of KOHN ASRs and what % of their total original contract amount does that represent?",
  "How much of our soft cost contingency have we used?",
  "Is there a vendor that consistently comes in over budget?",
  "How much have we paid FORTUNE DEVELOPMENT SALES and what % of their contract is that?",
  "Pull all the bids for the XYZ RFP and summarize them in a leveling table.",
  "Provide the summary of invoices raised in Jan 2023 for Project ABC.",
  "Which line items are over/under budget?",
  "Which consultant contracts are over budget?",
  "Which trades are over budget?",
  "Create a graph of spend by month from 2023 to 2025 (in millions).",
  "Show me the image of the latest KOHN invoice.",
  "How is the budget impacted after pending invoices are approved for Project Tower?",
  "How much have we paid Kohn Pedersen Fox Associates in 2023, 2024, and for the life of the contract?",
  "What are my top 3 vendors?",
  "What is the total retainage balance with Moss Associates?",
  "How much have we spent in total on the sales gallery?",
  "How many invoices are in Kevin Davenport’s queue for approval?",
  "How much have we spent on T&E YTD?",
  "Have we paid the KOHN consultant for the Design phase yet?",
  "How much have we spent on the Sales Gallery?",
  "Please show the 29 changes under 910004.",
  "Can you provide a summary of the KOHN contract?",
  "How much is their current contract value?",
  "What is the latest estimate for the hard cost for Sales Gallery 3?",
  "What is the trending budget for T1?",
  "What is the presented budget for SG3?",
  "Show me the approved submittals for SG3.",
  "What are the approved commitments for MRI GL Code 93-9016?",
  "What are the approved commitments for 93-9016?",
  "What are the current budgets for MRI GL Code 93-9016?"
];
