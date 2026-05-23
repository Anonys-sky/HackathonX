def compute_level(xp: int, xp_per_level: int = 500) -> int:
    return xp // xp_per_level + 1


def xp_to_next_level(xp: int, xp_per_level: int = 500) -> int:
    return xp_per_level - (xp % xp_per_level)


def compute_mascot_mood(
    spending_percent: float,
    streak: int,
    has_budget_alert: bool = False,
) -> str:
    if has_budget_alert:
        return "worried"
    if streak == 0 and spending_percent == 0:
        return "sleeping"
    if streak >= 7 and spending_percent < 60:
        return "celebrating"
    if spending_percent >= 90:
        return "alert"
    if spending_percent >= 70:
        return "worried"
    return "happy"


def is_budget_alert(spending_percent: float, threshold: int = 80) -> bool:
    return spending_percent >= threshold
