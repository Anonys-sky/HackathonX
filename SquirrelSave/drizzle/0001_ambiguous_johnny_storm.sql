CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_streaks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`friendId` int NOT NULL,
	`friendName` varchar(128) NOT NULL DEFAULT 'Friend',
	`friendAvatar` varchar(8) NOT NULL DEFAULT '🐷',
	`currentStreak` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_streaks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`walletId` int,
	`merchantName` varchar(128) NOT NULL,
	`rawText` text,
	`category` enum('food_beverage','transport','shopping','bills_utilities','entertainment','health','education','savings','income','other') NOT NULL DEFAULT 'other',
	`amount` float NOT NULL,
	`type` enum('expense','income') NOT NULL DEFAULT 'expense',
	`confidenceScore` float DEFAULT 1,
	`needsVerification` boolean NOT NULL DEFAULT false,
	`note` text,
	`transactedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`monthlyIncome` float NOT NULL DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'RM',
	`onboardingComplete` boolean NOT NULL DEFAULT false,
	`xpPoints` int NOT NULL DEFAULT 0,
	`level` int NOT NULL DEFAULT 1,
	`currentStreak` int NOT NULL DEFAULT 0,
	`longestStreak` int NOT NULL DEFAULT 0,
	`lastStreakDate` timestamp,
	`mascotMood` enum('happy','worried','alert','celebrating','sleeping') NOT NULL DEFAULT 'happy',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`walletType` enum('needs','wants','savings','emergency','goals') NOT NULL,
	`label` varchar(64) NOT NULL,
	`allocatedAmount` float NOT NULL DEFAULT 0,
	`currentBalance` float NOT NULL DEFAULT 0,
	`allocationPercent` float NOT NULL DEFAULT 0,
	`color` varchar(16) NOT NULL DEFAULT '#FF6B6B',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `xp_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`xpAwarded` int NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `xp_events_id` PRIMARY KEY(`id`)
);
