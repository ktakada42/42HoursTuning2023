CREATE FULLTEXT INDEX name_ft_idx ON user (user_name) WITH PARSER ngram;
CREATE FULLTEXT INDEX kana_ft_idx ON user (kana) WITH PARSER ngram;
CREATE FULLTEXT INDEX mail_ft_idx ON user (mail) WITH PARSER ngram;
CREATE FULLTEXT INDEX goal_ft_idx ON user (goal) WITH PARSER ngram;

CREATE FULLTEXT INDEX name_ft_idx ON department (department_name) WITH PARSER ngram;

CREATE FULLTEXT INDEX name_ft_idx ON role (role_name) WITH PARSER ngram;

CREATE FULLTEXT INDEX name_ft_idx ON office (office_name) WITH PARSER ngram;

CREATE FULLTEXT INDEX name_ft_idx ON skill (skill_name) WITH PARSER ngram;
