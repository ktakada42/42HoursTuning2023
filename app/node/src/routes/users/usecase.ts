import { Target, SearchedUser } from "../../model/types";
import {
  getUsersByUserName,
  getUsersByKana,
  getUsersByMail,
  getUsersByDepartmentName,
  getUsersByRoleName,
  getUsersByOfficeName,
  getUsersBySkillName,
  getUsersByGoal,
} from "./repository";

export const getUsersByKeyword = async (
  keyword: string,
  targets: Target[]
): Promise<SearchedUser[]> => {
  const users: SearchedUser[] = [];
  for (const target of targets) {
    const oldLen = users.length;
    switch (target) {
      case "userName":
        users.push(...(await getUsersByUserName(keyword)));
        break;
      case "kana":
        users.push(...(await getUsersByKana(keyword)));
        break;
      case "mail":
        users.push(...(await getUsersByMail(keyword)));
        break;
      case "department":
        users.push(...(await getUsersByDepartmentName(keyword)));
        break;
      case "role":
        users.push(...(await getUsersByRoleName(keyword)));
        break;
      case "office":
        users.push(...(await getUsersByOfficeName(keyword)));
        break;
      case "skill":
        users.push(...(await getUsersBySkillName(keyword)));
        break;
      case "goal":
        users.push(...(await getUsersByGoal(keyword)));
        break;
    }
    console.log(`${users.length - oldLen} users found by ${target}`);
  }
  return users;
};
