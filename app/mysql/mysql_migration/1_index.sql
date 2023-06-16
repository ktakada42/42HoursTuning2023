CREATE INDEX idx_user_id ON match_group_member(user_id);
CREATE INDEX idx_user_id_and_belong ON department_role_member(user_id, belong);
CREATE INDEX idx_role_id_and_belong ON department_role_member(role_id, belong);
CREATE INDEX idx_entry_date_and_kana ON user(entry_date, kana);
CREATE INDEX idx_mail_and_password ON user(mail, password);
