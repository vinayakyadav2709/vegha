def get_vehicle_type(type_id):
    type_map = {
        "car": "passenger",
        "truck": "truck",
        "bus": "bus",
        "motorcycle": "motorcycle",
        "bicycle": "bicycle",
        "taxi": "taxi",
    }
    return type_map.get(type_id, "other")


def get_all_vehicle_types():
    return [
        "passenger",
        "taxi",
        "bus",
        "truck",
        "trailer",
        "motorcycle",
        "moped",
        "bicycle",
        "pedestrian",
        "emergency",
        "delivery",
    ]
