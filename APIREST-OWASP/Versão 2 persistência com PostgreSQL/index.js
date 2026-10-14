const express = require('express');
const pool = require('./db');

const app = express();

app.use(express.json());

// LISTAR tarefas com filtros e paginação
app.get('/tarefas', async (req, res) => {
    try {
        const { concluida, prioridade } = req.query;

        const pagina = Number(req.query.pagina ?? 1);
        const limite = Number(req.query.limite ?? 10);

        if (
            !Number.isInteger(pagina) || pagina < 1 ||
            !Number.isInteger(limite) || limite < 1 || limite > 100
        ) {
            return res.status(400).json({
                erro: 'Pagina deve ser positiva e limite deve estar entre 1 e 100'
            });
        }

        const prioridadesValidas = ['baixa', 'media', 'alta'];

        if (
            prioridade !== undefined &&
            !prioridadesValidas.includes(prioridade)
        ) {
            return res.status(400).json({
                erro: 'Prioridade deve ser baixa, media ou alta'
            });
        }

        const filtros = [];
        const params = [];

        if (concluida !== undefined) {
            if (concluida !== 'true' && concluida !== 'false') {
                return res.status(400).json({
                    erro: 'Concluida deve ser true ou false'
                });
            }

            params.push(concluida === 'true');
            filtros.push(`concluida = $${params.length}`);
        }

        if (prioridade !== undefined) {
            params.push(prioridade);
            filtros.push(`prioridade = $${params.length}`);
        }

        let query = 'SELECT * FROM tarefas';

        if (filtros.length > 0) {
            query += ' WHERE ' + filtros.join(' AND ');
        }

        query += ' ORDER BY id';

        const offset = (pagina - 1) * limite;

        params.push(limite);
        query += ` LIMIT $${params.length}`;

        params.push(offset);
        query += ` OFFSET $${params.length}`;

        const resultado = await pool.query(query, params);

        res.json({
            pagina,
            limite,
            tarefas: resultado.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            erro: 'Erro ao buscar tarefas'
        });
    }
});

// ESTATISTICAS calculadas pelo PostgreSQL
app.get('/tarefas/resumo', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE concluida = TRUE) AS concluidas,
                COUNT(*) FILTER (WHERE concluida = FALSE) AS pendentes,
                COUNT(*) FILTER (WHERE prioridade = 'baixa') AS prioridade_baixa,
                COUNT(*) FILTER (WHERE prioridade = 'media') AS prioridade_media,
                COUNT(*) FILTER (WHERE prioridade = 'alta') AS prioridade_alta
            FROM tarefas
        `);

        res.json(resultado.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            erro: 'Erro ao consultar estatisticas'
        });
    }
});

// BUSCAR uma tarefa pelo ID
app.get('/tarefas/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                erro: 'ID invalido'
            });
        }

        const resultado = await pool.query(
            'SELECT * FROM tarefas WHERE id = $1',
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Tarefa nao encontrada'
            });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            erro: 'Erro ao buscar tarefa'
        });
    }
});

// CRIAR uma tarefa
app.post('/tarefas', async (req, res) => {
    try {
        const { titulo, prioridade = 'media' } = req.body;

        if (typeof titulo !== 'string' || !titulo.trim()) {
            return res.status(400).json({
                erro: 'O titulo e obrigatorio'
            });
        }

        if (titulo.trim().length > 255) {
            return res.status(400).json({
                erro: 'O titulo deve ter no maximo 255 caracteres'
            });
        }

        const prioridadesValidas = ['baixa', 'media', 'alta'];

        if (!prioridadesValidas.includes(prioridade)) {
            return res.status(400).json({
                erro: 'Prioridade deve ser baixa, media ou alta'
            });
        }

        const resultado = await pool.query(
            `INSERT INTO tarefas (titulo, prioridade)
             VALUES ($1, $2)
             RETURNING *`,
            [titulo.trim(), prioridade]
        );

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            erro: 'Erro ao criar tarefa'
        });
    }
});

// ATUALIZAR uma tarefa
app.put('/tarefas/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { titulo, concluida, prioridade } = req.body;

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                erro: 'ID invalido'
            });
        }

        if (titulo === undefined &&
            concluida === undefined &&
            prioridade === undefined) {
            return res.status(400).json({
                erro: 'Informe pelo menos um campo para atualizar'
            });
        }

        if (titulo !== undefined &&
            (typeof titulo !== 'string' ||
             !titulo.trim() ||
             titulo.trim().length > 255)) {
            return res.status(400).json({
                erro: 'O titulo deve ter entre 1 e 255 caracteres'
            });
        }

        if (concluida !== undefined &&
            typeof concluida !== 'boolean') {
            return res.status(400).json({
                erro: 'Concluida deve ser true ou false'
            });
        }

        const prioridadesValidas = ['baixa', 'media', 'alta'];

        if (prioridade !== undefined &&
            !prioridadesValidas.includes(prioridade)) {
            return res.status(400).json({
                erro: 'Prioridade deve ser baixa, media ou alta'
            });
        }

        const resultado = await pool.query(
            `UPDATE tarefas
             SET titulo = COALESCE($1, titulo),
                 concluida = COALESCE($2, concluida),
                 prioridade = COALESCE($3, prioridade)
             WHERE id = $4
             RETURNING *`,
            [
                titulo === undefined ? null : titulo.trim(),
                concluida === undefined ? null : concluida,
                prioridade === undefined ? null : prioridade,
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Tarefa nao encontrada'
            });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            erro: 'Erro ao atualizar tarefa'
        });
    }
});

// DELETAR uma tarefa
app.delete('/tarefas/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                erro: 'ID invalido'
            });
        }

        const resultado = await pool.query(
            'DELETE FROM tarefas WHERE id = $1 RETURNING id',
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Tarefa nao encontrada'
            });
        }

        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({
            erro: 'Erro ao deletar tarefa'
        });
    }
});

// INICIAR servidor
app.listen(3000, () => {
    console.log('API rodando na porta 3000');
});