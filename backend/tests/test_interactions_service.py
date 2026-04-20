from app.services.interactions import _ordered_unique_track_ids


def test_ordered_unique_track_ids_keeps_latest_order_and_skips_nulls():
    rows = [
        (12,),
        (7,),
        (12,),
        (None,),
        (4,),
        (7,),
    ]

    assert _ordered_unique_track_ids(rows) == [12, 7, 4]
