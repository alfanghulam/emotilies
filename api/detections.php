<?php
// GET    api/detections.php[?limit=N]   -> daftar deteksi (terbaru dulu)
// POST   api/detections.php             -> simpan 1 deteksi {emotion,confidence,source,image,created_at} atau array-nya
// DELETE api/detections.php?id=N | ?all=1
require __DIR__ . '/config.php';

try {
    $pdo = db();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $limit = max(1, min(1000, (int)($_GET['limit'] ?? 1000)));
        $rows = $pdo->query(
            "SELECT id, emotion, confidence, source, image_data AS image,
                    UNIX_TIMESTAMP(created_at) * 1000 AS created_at
             FROM detections ORDER BY detections.created_at DESC, id DESC LIMIT $limit"
        )->fetchAll();
        foreach ($rows as &$r) {
            $r['id'] = (int)$r['id'];
            $r['confidence'] = (float)$r['confidence'];
            $r['created_at'] = (float)$r['created_at'];
        }
        out($rows);
    }

    if ($method === 'POST') {
        $in = json_decode(file_get_contents('php://input'), true);
        if (!is_array($in)) out(['error' => 'Body JSON tidak valid'], 400);
        if (!isset($in[0])) $in = [$in];

        $st = $pdo->prepare(
            "INSERT INTO detections (emotion, confidence, source, image_data, created_at)
             VALUES (?, ?, ?, ?, FROM_UNIXTIME(?))"
        );
        $pdo->beginTransaction();
        foreach ($in as $d) {
            $img = $d['image'] ?? null;
            if ($img !== null && (strlen($img) > 300000 || strpos($img, 'data:image/') !== 0)) $img = null;
            $ts = (int)(($d['created_at'] ?? microtime(true) * 1000) / 1000);
            $st->execute([
                (string)($d['emotion'] ?? ''),
                round(max(0, min(1, (float)($d['confidence'] ?? 0))), 3),
                ($d['source'] ?? 'model') === 'demo' ? 'demo' : 'model',
                $img,
                $ts,
            ]);
        }
        $pdo->commit();
        out(['ok' => true, 'saved' => count($in)], 201);
    }

    if ($method === 'DELETE') {
        if (isset($_GET['all'])) {
            $pdo->exec('DELETE FROM detections');
        } else {
            $pdo->prepare('DELETE FROM detections WHERE id = ?')->execute([(int)($_GET['id'] ?? 0)]);
        }
        out(['ok' => true]);
    }

    out(['error' => 'Method tidak didukung'], 405);
} catch (Throwable $e) {
    out(['error' => $e->getMessage()], 500);
}
