import { RowDataPacket } from "mysql2";
import pool from "../../util/mysql";
import {
  MatchGroupConfig,
  Owner,
  SearchedUser,
  User,
  UserForFilter,
} from "../../model/types";
import {
  convertToOwner,
  convertToSearchedUsers,
  convertToUserForFilter,
  convertToUsers,
} from "../../model/utils";
import { getUserIdsBeforeMatched } from "../match-groups/repository";

export const getUserIdByMailAndPassword = async (
  mail: string,
  hashPassword: string
): Promise<string | undefined> => {
  const [user] = await pool.query<RowDataPacket[]>(
    "SELECT user_id FROM user WHERE mail = ? AND password = ?",
    [mail, hashPassword]
  );
  if (user.length === 0) {
    return;
  }

  return user[0].user_id;
};

export const getUsers = async (
  limit: number,
  offset: number
): Promise<User[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT \
    user.user_id, \
    user.user_name, \
    user.user_icon_id, \
    office.office_name, \
    file.file_name \
    FROM user \
    JOIN office ON user.office_id = office.office_id \
    JOIN file ON user.user_icon_id = file.file_id \
    ORDER BY entry_date ASC, kana ASC \
    LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return convertToUsers(rows);
};

export const getUserByUserId = async (
  userId: string
): Promise<User | undefined> => {
  const [user] = await pool.query<RowDataPacket[]>(
    "SELECT user_id, user_name, office_id, user_icon_id FROM user WHERE user_id = ?",
    [userId]
  );
  if (user.length === 0) {
    return;
  }

  const [office] = await pool.query<RowDataPacket[]>(
    `SELECT office_name FROM office WHERE office_id = ?`,
    [user[0].office_id]
  );
  const [file] = await pool.query<RowDataPacket[]>(
    `SELECT file_name FROM file WHERE file_id = ?`,
    [user[0].user_icon_id]
  );

  return {
    userId: user[0].user_id,
    userName: user[0].user_name,
    userIcon: {
      fileId: user[0].user_icon_id,
      fileName: file[0].file_name,
    },
    officeName: office[0].office_name,
  };
};

export const getUsersByUserIds = async (
  userIds: string[]
): Promise<SearchedUser[]> => {
  if (userIds.length === 0) {
    return [];
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT \
    user.user_id, \
    user.user_name, \
    user.kana, \
    user.entry_date, \
    user.user_icon_id, \
    office.office_name, \
    file.file_name \
    FROM user \
    JOIN office ON user.office_id = office.office_id \
    JOIN file ON user.user_icon_id = file.file_id \
    WHERE user.user_id IN (?)`,
    [userIds]
  );

  return convertToSearchedUsers(rows);
};

export const getUsersByUserName = async (
  userName: string
): Promise<SearchedUser[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE MATCH (user_name) AGAINST (? IN BOOLEAN MODE)`,
    [userName]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByKana = async (kana: string): Promise<SearchedUser[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE MATCH (kana) AGAINST (? IN BOOLEAN MODE)`,
    [kana]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByMail = async (mail: string): Promise<SearchedUser[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE MATCH (mail) AGAINST (? IN BOOLEAN MODE)`,
    [mail]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByDepartmentName = async (
  departmentName: string
): Promise<SearchedUser[]> => {
  const [departmentIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT department_id FROM department WHERE MATCH (department_name) AGAINST (? IN BOOLEAN MODE) AND active = true`,
    [departmentName]
  );
  const departmentIds: string[] = departmentIdRows.map(
    (row) => row.department_id
  );

  let userIdRows: RowDataPacket[] = [];
  if (departmentIds.length !== 0) {
    [userIdRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id FROM department_role_member WHERE department_id IN (?) AND belong = true`,
      [departmentIds]
    );
  }
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByRoleName = async (
  roleName: string
): Promise<SearchedUser[]> => {
  const [roleIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT role_id FROM role WHERE MATCH (role_name) AGAINST (? IN BOOLEAN MODE) AND active = true`,
    [roleName]
  );
  const roleIds: string[] = roleIdRows.map((row) => row.role_id);

  let userIdRows: RowDataPacket[] = [];
  if (roleIds.length !== 0) {
    [userIdRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id FROM department_role_member WHERE role_id IN (?) AND belong = true`,
      [roleIds]
    );
  }
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByOfficeName = async (
  officeName: string
): Promise<SearchedUser[]> => {
  const [officeIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT office_id FROM office WHERE MATCH (office_name) AGAINST (? IN BOOLEAN MODE)`,
    [officeName]
  );
  const officeIds: string[] = officeIdRows.map((row) => row.office_id);

  let userIdRows: RowDataPacket[] = [];
  if (officeIds.length !== 0) {
    [userIdRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id FROM user WHERE office_id IN (?)`,
      [officeIds]
    );
  }
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersBySkillName = async (
  skillName: string
): Promise<SearchedUser[]> => {
  const [skillIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT skill_id FROM skill WHERE skill_name LIKE ?`,
    [`%${skillName}%`]
  );
  const skillIds: string[] = skillIdRows.map((row) => row.skill_id);

  let userIdRows: RowDataPacket[] = [];
  if (skillIds.length !== 0) {
    [userIdRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id FROM skill_member WHERE skill_id IN (?)`,
      [skillIds]
    );
  }
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByGoal = async (goal: string): Promise<SearchedUser[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE MATCH (goal) AGAINST (? IN BOOLEAN MODE)`,
    [goal]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUserForFilter = async (
  userId?: string
): Promise<UserForFilter> => {
  let userRows: RowDataPacket[];
  if (!userId) {
    [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT user_id, user_name, office_id, user_icon_id FROM user ORDER BY RAND() LIMIT 1"
    );
  } else {
    [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT user_id, user_name, office_id, user_icon_id FROM user WHERE user_id = ?",
      [userId]
    );
  }
  const user = userRows[0];

  const [officeNameRow] = await pool.query<RowDataPacket[]>(
    `SELECT office_name FROM office WHERE office_id = ?`,
    [user.office_id]
  );
  const [fileNameRow] = await pool.query<RowDataPacket[]>(
    `SELECT file_name FROM file WHERE file_id = ?`,
    [user.user_icon_id]
  );
  const [departmentNameRow] = await pool.query<RowDataPacket[]>(
    `SELECT department_name FROM department WHERE department_id = (SELECT department_id FROM department_role_member WHERE user_id = ? AND belong = true)`,
    [user.user_id]
  );
  const [skillNameRows] = await pool.query<RowDataPacket[]>(
    `SELECT skill_name FROM skill WHERE skill_id IN (SELECT skill_id FROM skill_member WHERE user_id = ?)`,
    [user.user_id]
  );

  user.office_name = officeNameRow[0].office_name;
  user.file_name = fileNameRow[0].file_name;
  user.department_name = departmentNameRow[0].department_name;
  user.skill_names = skillNameRows.map((row) => row.skill_name);

  return convertToUserForFilter(user);
};

export const getOwnerByUserId = async (userId: string): Promise<Owner> => {
  const [ownerRow] = await pool.query<RowDataPacket[]>(
    "SELECT user_id, user_name, office_id, user_icon_id FROM user WHERE user_id = ?",
    [userId]
  );
  const owner = ownerRow[0];

  const [officeNameRow] = await pool.query<RowDataPacket[]>(
    `SELECT office_name FROM office WHERE office_id = ?`,
    [owner.office_id]
  );
  const [fileNameRow] = await pool.query<RowDataPacket[]>(
    `SELECT file_name FROM file WHERE file_id = ?`,
    [owner.user_icon_id]
  );
  const [departmentIdRow] = await pool.query<RowDataPacket[]>(
    `SELECT department_id FROM department_role_member WHERE user_id = ? AND belong = true`,
    [owner.user_id]
  );

  owner.office_name = officeNameRow[0].office_name;
  owner.file_name = fileNameRow[0].file_name;
  owner.department_id = departmentIdRow[0].department_id;

  return convertToOwner(owner);
};

export const getMembers = async (
  owner: Owner,
  matchGroupConfig: MatchGroupConfig
): Promise<User[] | undefined> => {
  if (
    matchGroupConfig.departmentFilter === "none" &&
    matchGroupConfig.officeFilter === "none" &&
    matchGroupConfig.skillFilter.length === 0
  ) {
    const excludeUserIds = [owner.userId];
    if (matchGroupConfig.neverMatchedFilter) {
      const matchedBeforeUserIds = await getUserIdsBeforeMatched(owner.userId);
      excludeUserIds.push(...matchedBeforeUserIds);
    }

    const [memberIdRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id FROM user WHERE user_id NOT IN (?) ORDER BY RAND() LIMIT ?`,
      [excludeUserIds, matchGroupConfig.numOfMembers - 1]
    );
    const memberIds = memberIdRows.map((row) => row.user_id);

    return getUsersByUserIds(memberIds.concat(owner.userId));
  }

  let candidateUserIds: string[] = [];

  if (matchGroupConfig.departmentFilter === "onlyMyDepartment") {
    const [departmentMatchUserIdRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id FROM department_role_member WHERE department_id = ? AND belong = true AND user_id != ?`,
      [owner.departmentId, owner.userId]
    );
    departmentMatchUserIdRows.map((row) => candidateUserIds.push(row.user_id));
  } else if (matchGroupConfig.departmentFilter === "excludeMyDepartment") {
    const [departmentMatchUserIdRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id FROM department_role_member WHERE department_id != ? AND belong = true`,
      [owner.departmentId]
    );
    departmentMatchUserIdRows.map((row) => candidateUserIds.push(row.user_id));
  }
  console.log("department filter done");

  if (matchGroupConfig.officeFilter === "onlyMyOffice") {
    const [officeMatchUserIdRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id FROM user WHERE office_id = ? AND user_id != ?`,
      [owner.officeId, owner.userId]
    );
    officeMatchUserIdRows.map((row) => candidateUserIds.push(row.user_id));
  } else if (matchGroupConfig.officeFilter === "excludeMyOffice") {
    const [officeMatchUserIdRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id FROM user WHERE office_id != ?`,
      [owner.officeId]
    );
    officeMatchUserIdRows.map((row) => candidateUserIds.push(row.user_id));
  }
  console.log("office filter done");

  if (matchGroupConfig.skillFilter.length > 0) {
    const [skillMatchSkillIdRows] = await pool.query<RowDataPacket[]>(
      `SELECT skill_id FROM skill WHERE skill_name IN (?)`,
      [matchGroupConfig.skillFilter]
    );
    const [skillMatchUserIdRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id FROM skill_member WHERE skill_id IN (?)`,
      [skillMatchSkillIdRows.map((row) => row.skill_id)]
    );
    skillMatchUserIdRows.map((row) => candidateUserIds.push(row.user_id));
  }
  console.log("skill filter done");

  if (matchGroupConfig.neverMatchedFilter) {
    const matchedBeforeUserIds = await getUserIdsBeforeMatched(owner.userId);
    candidateUserIds = Array.from(
      new Set([...candidateUserIds, ...matchedBeforeUserIds])
    );
  }
  console.log("never matched filter done");

  console.log(`found ${candidateUserIds.length} users as members`);
  if (candidateUserIds.length < matchGroupConfig.numOfMembers - 1) {
    return undefined;
  }

  const memberIds: string[] = [];
  while (memberIds.length < matchGroupConfig.numOfMembers - 1) {
    const randomIndex = Math.floor(Math.random() * candidateUserIds.length);
    if (!memberIds.includes(candidateUserIds[randomIndex])) {
      memberIds.push(candidateUserIds[randomIndex]);
    }
  }

  return getUsersByUserIds(memberIds.concat(owner.userId));
};
