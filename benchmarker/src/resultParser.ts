import { readFileSync, writeFileSync } from "fs";
import { basename } from "path";

interface scenario {
  name: string;
  method: string;
  url: string;
}

type Log = {
  metric: string;
  type: string;
  data: {
    time: string;
    value: number;
    tags: Record<string, string>;
  };
};

interface apiResult {
  scenarioName: string;
  method: string;
  url: string;
  success: number;
  fail: number;
  timeout: number;
}

interface finalResult {
  score: number;
  totalSuccess: number;
  totalFail: number;
  apiResultsForSubmit: apiResultForSubmit[];
}

interface apiResultForSubmit {
  method: string;
  path: string;
  success: number;
  fail: number;
  timeout: number;
}

const readFile = (resultFile: string): Log[] => {
  const fileData = readFileSync(resultFile, "utf-8");
  const fileLines = fileData.split("\n").slice(0, -1);

  return fileLines.map((line) => JSON.parse(line));
};

const APIs = {
  login: "login",
  getUsers: "getUsers",
  getUserIcon: "getUserIcon",
  searchUsers: "searchUsers",
  createMatchGroup: "createMatchGroup",
  getMatchGroups: "getMatchGroups",
} as const;

const getAPIName = (url: string): string => {
  switch (true) {
    case url.includes("session"):
      return APIs.login;
    case url.endsWith("users"):
      return APIs.getUsers;
    case url.includes("user-icon"):
      return APIs.getUserIcon;
    case url.includes("search"):
      return APIs.searchUsers;
    case url.endsWith("match-groups"):
      return APIs.createMatchGroup;
    case url.includes("match-groups"):
      return APIs.getMatchGroups;
    default:
      return "";
  }
};

const createResultAggregator = (
  checksResults: Log[],
  timeoutResults: Log[]
): apiResult[] => {
  const scenarios: scenario[] = [
    {
      name: APIs.login,
      method: "POST",
      url: "/api/v1/session",
    },
    {
      name: APIs.getUsers,
      method: "GET",
      url: "/api/v1/users",
    },
    {
      name: APIs.getUserIcon,
      method: "GET",
      url: "/api/v1/users/user-icon/{userIconId}",
    },
    {
      name: APIs.searchUsers,
      method: "GET",
      url: "/api/v1/users/search",
    },
    {
      name: APIs.getMatchGroups,
      method: "GET",
      url: "/api/v1/match-groups/members/{userId}",
    },
    {
      name: APIs.createMatchGroup,
      method: "POST",
      url: "/api/v1/match-groups",
    },
  ];

  return scenarios.map((scenario) => {
    const timeout = timeoutResults.filter(
      (result) => getAPIName(result.data.tags.url) === scenario.name
    ).length;
    const success = checksResults.filter(
      (result) =>
        result.data.tags.api === scenario.name && result.data.value === 1
    ).length;
    const fail =
      checksResults.filter(
        (result) =>
          result.data.tags.api === scenario.name && result.data.value === 0
      ).length - timeout;

    return {
      scenarioName: scenario.name,
      method: scenario.method,
      url: scenario.url,
      success: success,
      fail: fail,
      timeout: timeout,
    };
  });
};

const outputApiResult = (apiResult: apiResult): apiResultForSubmit => {
  console.log(
    `
    - ${apiResult.method} ${apiResult.url}
      ✓ requests: ${
        apiResult.success + apiResult.fail + apiResult.timeout
      }, success: ${apiResult.success}, fail: ${apiResult.fail}, timeout: ${
      apiResult.timeout
    }
    `
  );

  return {
    method: apiResult.method,
    path: apiResult.url,
    success: apiResult.success,
    fail: apiResult.fail,
    timeout: apiResult.timeout,
  };
};

const calcResults = (apiResults: apiResult[]): finalResult => {
  const fail_weight = 20;
  const write_weight = 10;

  const finalResult = apiResults.reduce(
    (acc: finalResult, cur) => {
      if (cur.method === "GET") {
        acc.score += cur.success - cur.fail * fail_weight;
      } else if (cur.method === "POST") {
        acc.score += cur.success * write_weight - cur.fail * fail_weight;
      }
      acc.totalSuccess += cur.success;
      acc.totalFail += cur.fail;
      acc.apiResultsForSubmit.push(outputApiResult(cur));
      return acc;
    },
    { score: 0, totalSuccess: 0, totalFail: 0, apiResultsForSubmit: [] }
  );

  finalResult.score = finalResult.score > 0 ? finalResult.score : 0;
  return finalResult;
};

const main = () => {
  if (!process.argv[2]) {
    console.error("第1引数に解析対象のファイルを指定してください");
    process.exit(1);
  }
  const resultFile: string = process.argv[2];

  const allResults: Log[] = readFile(resultFile);

  const checksResults = allResults.filter(
    (result) => result.metric === "checks" && result.type === "Point"
  );

  const timeoutResults = allResults.filter(
    (entry) =>
      entry.type !== "Metric" &&
      entry.metric === "http_reqs" &&
      "error" in entry.data.tags &&
      entry.data.tags.error === "request timeout"
  );

  const apiResults = createResultAggregator(checksResults, timeoutResults);

  console.log(`Results per API:`);
  const finalResult = calcResults(apiResults);
  const totalRequests =
    finalResult.totalSuccess + finalResult.totalFail + timeoutResults.length;
  console.log(
    `
    ================================================================
        Congratulations! All Scoring Process Successfully Done!!

        Score: ${finalResult.score.toString().padStart(19)}

        Total requests: ${totalRequests.toString().padStart(10)}
          Success: ${finalResult.totalSuccess.toString().padStart(15)}
          Fail: ${finalResult.totalFail.toString().padStart(18)}
          Timeout: ${timeoutResults.length.toString().padStart(15)}
        RPS: ${(Math.round((totalRequests / 60) * 100) / 100)
          .toString()
          .padStart(21)}
    ================================================================
    `
  );

  const writeText = JSON.stringify({
    commit: process.env.COMMIT,
    pass: true,
    score: finalResult.score,
    success: finalResult.totalSuccess,
    fail: finalResult.totalFail,
    resultPerApi: finalResult.apiResultsForSubmit,
  });

  writeFileSync(`/scoring/score/${basename(resultFile)}`, writeText);
};

main();
