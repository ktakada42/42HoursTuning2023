CREATE INDEX idx_user_id ON match_group_member(user_id);
CREATE INDEX idx_user_id_and_belong ON department_role_member(user_id, belong);
CREATE INDEX idx_role_id_and_belong ON department_role_member(role_id, belong);
CREATE INDEX idx_department_id_and_belong_and_user_id ON department_role_member(department_id, belong, user_id);
CREATE INDEX idx_entry_date_and_kana ON user(entry_date, kana);
CREATE INDEX idx_mail_and_password ON user(mail, password);
CREATE INDEX idx_office_id_and_user_id ON user(office_id, user_id);
