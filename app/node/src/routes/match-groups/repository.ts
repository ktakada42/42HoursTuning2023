import { RowDataPacket } from "mysql2";
import pool from "../../util/mysql";
import { MatchGroup, MatchGroupDetail, User } from "../../model/types";
import { getUsersByUserIds } from "../users/repository";
import {
  convertDateToString,
  convertToMatchGroupDetail,
} from "../../model/utils";

export const hasSkillNameRecord = async (
  skillName: string
): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM skill WHERE EXISTS (SELECT * FROM skill WHERE skill_name = ?)",
    [skillName]
  );
  return rows.length > 0;
};

export const getUserIdsBeforeMatched = async (
  userId: string
): Promise<string[]> => {
  const [matchGroupIdRows] = await pool.query<RowDataPacket[]>(
    "SELECT match_group_id FROM match_group_member WHERE user_id = ?",
    [userId]
  );
  if (matchGroupIdRows.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    "SELECT user_id FROM match_group_member WHERE match_group_id IN (?)",
    [matchGroupIdRows]
  );

  return userIdRows.map((row) => row.user_id);
};

export const insertMatchGroup = async (matchGroupDetail: MatchGroupDetail) => {
  await pool.query<RowDataPacket[]>(
    "INSERT INTO match_group (match_group_id, match_group_name, description, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      matchGroupDetail.matchGroupId,
      matchGroupDetail.matchGroupName,
      matchGroupDetail.description,
      matchGroupDetail.status,
      matchGroupDetail.createdBy,
      matchGroupDetail.createdAt,
    ]
  );

  for (const member of matchGroupDetail.members) {
    await pool.query<RowDataPacket[]>(
      "INSERT INTO match_group_member (match_group_id, user_id) VALUES (?, ?)",
      [matchGroupDetail.matchGroupId, member.userId]
    );
  }
};

export const getMatchGroupDetailByMatchGroupId = async (
  matchGroupId: string,
  status?: string
): Promise<MatchGroupDetail | undefined> => {
  let query =
    "SELECT match_group_id, match_group_name, description, status, created_by, created_at FROM match_group WHERE match_group_id = ?";
  if (status === "open") {
    query += " AND status = 'open'";
  }
  const [matchGroup] = await pool.query<RowDataPacket[]>(query, [matchGroupId]);
  if (matchGroup.length === 0) {
    return;
  }

  const [matchGroupMemberIdRows] = await pool.query<RowDataPacket[]>(
    "SELECT user_id FROM match_group_member WHERE match_group_id = ?",
    [matchGroupId]
  );
  const matchGroupMemberIds: string[] = matchGroupMemberIdRows.map(
    (row) => row.user_id
  );

  const searchedUsers = await getUsersByUserIds(matchGroupMemberIds);
  // SearchedUserからUser型に変換
  const members: User[] = searchedUsers.map((searchedUser) => {
    const { kana: _kana, entryDate: _entryDate, ...rest } = searchedUser;
    return rest;
  });
  matchGroup[0].members = members;

  return convertToMatchGroupDetail(matchGroup[0]);
};

export const getMatchGroupIdsByUserId = async (
  userId: string
): Promise<string[]> => {
  const [matchGroupIds] = await pool.query<RowDataPacket[]>(
    "SELECT match_group_id FROM match_group_member WHERE user_id = ?",
    [userId]
  );
  return matchGroupIds.map((row) => row.match_group_id);
};

export const getMatchGroupsByMatchGroupIds = async (
  matchGroupIds: string[],
  status: string
): Promise<MatchGroup[]> => {
  let matchGroups: MatchGroup[] = [];
  for (const matchGroupId of matchGroupIds) {
    const matchGroupDetail = await getMatchGroupDetailByMatchGroupId(
      matchGroupId,
      status
    );
    if (matchGroupDetail) {
      const { description: _description, ...matchGroup } = matchGroupDetail;
      matchGroups = matchGroups.concat(matchGroup);
    }
  }

  return matchGroups;
};

export const getMatchGroupsByMatchGroupIdsWithoutNPlusOne = async (
  matchGroupIds: string[],
  status: string
): Promise<MatchGroup[]> => {
  let query = `SELECT \
  match_group.match_group_id, \
  match_group.match_group_name, \
  match_group.status, \
  match_group.created_by, \
  match_group.created_at, \
  GROUP_CONCAT(user.user_id) AS user_ids, \
  GROUP_CONCAT(user.user_name) AS user_names, \
  GROUP_CONCAT(user.user_icon_id) AS user_icon_ids, \
  GROUP_CONCAT(office.office_name) AS office_names, \
  GROUP_CONCAT(file.file_name) AS file_names \
  FROM match_group \
  JOIN match_group_member ON match_group.match_group_id = match_group_member.match_group_id \
  JOIN user ON match_group_member.user_id = user.user_id \
  JOIN office ON user.office_id = office.office_id \
  JOIN file ON user.user_icon_id = file.file_id \
  WHERE match_group.match_group_id IN (?)`;
  if (status === "open") {
    query += " AND match_group.status = 'open'";
  }
  query += " GROUP BY match_group.match_group_id, match_group.status";

  const [matchGroupRows] = await pool.query<RowDataPacket[]>(query, [
    matchGroupIds,
  ]);
  if (matchGroupRows.length === 0) {
    return [];
  }

  return matchGroupRows.map((row) => {
    return {
      matchGroupId: row.match_group_id,
      matchGroupName: row.match_group_name,
      members: row.user_ids.split(",").map((userId: string, index: number) => {
        return {
          userId,
          userName: row.user_names.split(",")[index],
          userIcon: {
            fileId: row.user_icon_ids.split(",")[index],
            fileName: row.file_names.split(",")[index],
          },
          officeName: row.office_names.split(",")[index],
        };
      }),
      status: row.status,
      createdBy: row.created_by,
      createdAt: convertDateToString(row.created_at),
    };
  });
};
