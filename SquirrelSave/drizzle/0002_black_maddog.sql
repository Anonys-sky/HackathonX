CREATE TABLE `savings_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`targetAmount` float NOT NULL,
	`currentAmount` float NOT NULL DEFAULT 0,
	`deadline` timestamp,
	`category` varchar(64) NOT NULL DEFAULT 'general',
	`emoji` varchar(8) NOT NULL DEFAULT '🎯',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `savings_goals_id` PRIMARY KEY(`id`)
);
