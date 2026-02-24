# Mini Compilador Matemático 🚀

Una implementación académica de un compilador de expresiones matemáticas siguiendo las fases clásicas de compilación. Este proyecto cuenta con un motor de compilación basado en Python integrado en un tablero web moderno y trilingüe (EN/ES/FR).

## 🌟 Características

- **Pipeline de Compilación Clásico**: Implementación completa de análisis Léxico, Sintáctico y Semántico.
- **Árbol de Sintaxis Abstracta (AST)**: Visualización profesional de la estructura de la expresión utilizando D3.js.
- **Soporte Trilingüe**: Interfaz disponible en inglés, español y francés.
- **Tablero Moderno**: Visualización en tiempo real de la tokenización y la evaluación.
- **Soporte Matemático**: Maneja enteros, decimales, operadores básicos (+, -, *, /), paréntesis y potenciación (^).

---

## 🏗️ Cómo Funciona (Fases de Compilación)

El compilador procesa las expresiones matemáticas en cuatro etapas distintas:

### 1. Analizador Léxico (Lexer)
El **Lexer** toma la cadena de entrada sin procesar y la divide en **Tokens**. 
- Ignora los espacios en blanco.
- Identifica números (enteros y flotantes).
- Categoriza los símbolos en tipos como `PLUS`, `MINUS`, `MUL`, `DIV`, `POW`, `LPAREN` y `RPAREN`.
- **Resultado**: Una lista de objetos `Token`.

### 2. Analizador Sintáctico (Parser)
El **Parser** utiliza un algoritmo de **Descenso Recursivo** para validar la secuencia de tokens frente a una gramática formal.
- Aplica la precedencia de operadores (PEMDAS/BODMAS).
- Maneja la asociatividad a la derecha para la potenciación (ej., `2^3^2` se evalúa como `2^(3^2)`).
- **Resultado**: Un **Árbol de Sintaxis Abstracta (AST)**.

### 3. Construcción del AST
El AST es una representación jerárquica de la estructura de la expresión.
- **NumberNodes**: Nodos hoja que contienen valores numéricos.
- **BinOpNodes**: Nodos internos que contienen un operador y dos hijos (izquierdo y derecho).
- Esta estructura facilita el recorrido y la evaluación de la lógica matemática.

### 4. Evaluación Semántica (Evaluador)
El **Evaluador** realiza un recorrido post-orden recursivo del AST.
- Calcula los valores de abajo hacia arriba.
- Maneja errores semánticos, como la **División por Cero**.
- **Resultado**: El resultado numérico final.

---

## 📂 Estructura del Proyecto

- `compiler.py`: El motor principal en Python que contiene el Lexer, Parser y Evaluador.
- `server.ts`: Servidor Express.js que conecta la interfaz web con el motor de Python.
- `src/App.tsx`: Frontend en React con el tablero y la visualización en D3.js.
- `metadata.json`: Metadatos del proyecto y permisos.

---

## 🚀 Primeros Pasos

### Requisitos Previos
- Node.js y npm
- Python 3

### Instalación
1. Instalar dependencias:
   ```bash
   npm install
   ```

### Ejecución de la Aplicación
1. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
2. Abra su navegador en la URL local proporcionada (usualmente el puerto 3000).

### Ejecución del Compilador vía CLI
También puede ejecutar el motor del compilador directamente desde su terminal:
```bash
python3 compiler.py "3 + 5 * (10 / 2)"
```

---

## 👥 Equipo de Desarrollo

- **D´Andre Ryan Boston**: Arquitecto Backend
- **Johana Gonzalez**: Líder de Proyecto
- **Dani Maza**: Ingeniero Frontend
- **Yulian Herrera**: Ingeniero de Calidad (QA)

---

## 📜 Licencia
Este proyecto ha sido desarrollado con fines académicos.
