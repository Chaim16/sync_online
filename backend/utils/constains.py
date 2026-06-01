import os
import enum

current_file = os.path.abspath(__file__)
PROJECT_HOME = os.path.dirname(os.path.dirname(current_file))
LOG_DIR = os.path.join(PROJECT_HOME, "logs")

APP_NAME = "cars_talk"

