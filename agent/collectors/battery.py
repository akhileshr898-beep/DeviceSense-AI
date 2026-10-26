import psutil


def collect_battery():
    """
    Collects battery percentage and AC charging state when supported.
    Returns None for desktops or virtualized environments without battery sensors.
    """
    try:
        battery = psutil.sensors_battery()
        if battery is None:
            return {
                "battery_percent": None,
                "battery_plugged": None,
            }
        return {
            "battery_percent": float(battery.percent),
            "battery_plugged": bool(battery.power_plugged),
        }
    except Exception:
        return {
            "battery_percent": None,
            "battery_plugged": None,
        }

