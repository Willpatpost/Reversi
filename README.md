# Othello/Reversi Game with AI

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)

## Overview

This project implements the classic board game **Othello/Reversi** in Python, featuring a user-friendly graphical interface built with Tkinter. Players can compete against another human or challenge an AI opponent with adjustable difficulty levels. The game includes additional features such as dynamic AI depth, undo functionality, and customizable board sizes, providing an engaging and versatile gaming experience.

## Features

- **Graphical User Interface**: Intuitive and visually appealing interface using Tkinter.
- **AI Opponent**: Play against an AI with three difficulty levels—Easy, Medium, and Hard.
- **Adjustable Difficulty**: The Easy difficulty selects moves randomly, making it ideal for beginners.
- **Dynamic AI Depth**: AI can adjust its search depth based on the game’s progression for optimized performance.
- **Customizable Settings**: Choose board size (even numbers between 6 and 20), player color, and enable or disable undo functionality.
- **Undo Functionality**: Optionally undo the last move(s) to rectify mistakes.
- **Move Log**: Keeps a record of all moves made during the game.
- **Responsive Design**: Automatically adjusts cell sizes for larger boards to maintain usability.
- **Logging**: Detailed game events are logged in `othello.log` for debugging and analysis.

## Requirements

- **Python 3.7 or higher**

### Python Libraries

- [Tkinter](https://docs.python.org/3/library/tkinter.html) (`tkinter`) – Usually included with Python installations.
- [NumPy](https://numpy.org/) (`numpy`)
- [Logging](https://docs.python.org/3/library/logging.html) (`logging`)
- [Enum](https://docs.python.org/3/library/enum.html) (`enum`)
- [Typing](https://docs.python.org/3/library/typing.html) (`typing`)

### Installation of Python Libraries

You can install the required Python libraries using `pip`. Open your terminal or command prompt and execute:

```bash
pip install numpy
