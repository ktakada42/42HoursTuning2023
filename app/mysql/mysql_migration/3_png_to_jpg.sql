UPDATE file
SET
    file_name = REPLACE(file_name, '.png', '.jpg'),
    path = REPLACE(path, '.png', '.jpg')
WHERE
    file_name LIKE '%.png' AND path LIKE '%.png';
