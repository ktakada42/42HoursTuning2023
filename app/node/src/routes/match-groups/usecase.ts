import { v4 as uuidv4 } from "uuid";
import { MatchGroupDetail, MatchGroupConfig } from "../../model/types";
import { hasSkillNameRecord, insertMatchGroup } from "./repository";
import { getMembers, getOwnerByUserId } from "../users/repository";
import { convertDateToString } from "../../model/utils";

export const checkSkillsRegistered = async (
  skillNames: string[]
): Promise<string | undefined> => {
  for (const skillName of skillNames) {
    if (!(await hasSkillNameRecord(skillName))) {
      return skillName;
    }
  }

  return;
};

export const createMatchGroup = async (
  matchGroupConfig: MatchGroupConfig
): Promise<MatchGroupDetail | undefined> => {
  const owner = await getOwnerByUserId(matchGroupConfig.ownerId);

  const matchedMembers = await getMembers(owner, matchGroupConfig);
  if (!matchedMembers) {
    return undefined;
  }

  const matchGroupId = uuidv4();
  const createdAt = new Date();
  await insertMatchGroup({
    matchGroupId,
    matchGroupName: matchGroupConfig.matchGroupName,
    description: matchGroupConfig.description,
    members: matchedMembers,
    status: "open",
    createdBy: matchGroupConfig.ownerId,
    createdAt,
  });

  return {
    matchGroupId,
    matchGroupName: matchGroupConfig.matchGroupName,
    description: matchGroupConfig.description,
    members: matchedMembers,
    status: "open",
    createdBy: matchGroupConfig.ownerId,
    createdAt: convertDateToString(createdAt),
  };
};
