"""Mirror the game's four-neighbour mine reveal and visible-floor tint."""
from collections import deque

from PIL import Image

TUNNEL_TINT = (13, 16, 28, 201)


def visible_from(rows, origin, radius, opened=()):
    visible = set()
    queue = deque([(*origin, 0)])
    while queue:
        x, y, distance = queue.popleft()
        if not 0 <= y < len(rows) or not 0 <= x < len(rows[y]) or (x, y) in visible:
            continue
        visible.add((x, y))
        if distance < radius and (rows[y][x] != '#' or (x, y) in opened):
            for dx, dy in ((0, -1), (1, 0), (0, 1), (-1, 0)):
                queue.append((x + dx, y + dy, distance + 1))
    return visible


def darkened_map(grid, rows, seen):
    tile = Image.new('RGBA', (60, 60), TUNNEL_TINT)
    out = grid.convert('RGBA')
    for y, row in enumerate(rows):
        for x, char in enumerate(row):
            if char == ',' and (x, y) not in seen:
                out.alpha_composite(tile, (x * 60, y * 60))
    return out.convert('RGB')
