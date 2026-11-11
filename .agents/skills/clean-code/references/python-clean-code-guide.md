# Python & FastAPI Async Clean Code Guidelines

> Production standards for writing clean, type-safe, asynchronous, and resilient Python backend code.

---

## 1. Type Hints & Pydantic v2 Models

### 1.1 Modern Type Annotations (Python 3.10+)
- Always annotate function parameters and return types.
- Use native collection types (`list[str]`, `dict[str, Any]`, `set[int]`) instead of importing from `typing`.

```python
# ❌ BAD: Untyped or old typing import
from typing import List, Dict, Optional

def process_users(users: List[Dict]):
    pass

# ✅ GOOD: Modern Python 3.10+ type hints
from typing import Any

def process_users(users: list[dict[str, Any]]) -> list[str]:
    return [u["name"] for u in users if "name" in u]
```

### 1.2 Pydantic v2 Schema Validation
- Model external API payloads, database records, and environment variables using Pydantic `BaseModel`.

```python
from pydantic import BaseModel, Field, EmailStr, field_validator

class UserCreateRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, description="Unique username")
    age: int = Field(ge=18, le=120, description="User age in years")
    is_active: bool = True

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not v.isalnum():
            raise ValueError("Username must be alphanumeric")
        return v.lower()
```

---

## 2. FastAPI Architecture & Exception Handling

### 2.1 Dependency Injection & Router Decomposition
- Keep route handlers minimal (< 30 lines). Business logic belongs in service classes or utility functions.

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service),
) -> UserResponse:
    try:
        return await user_service.create(db, payload)
    except DuplicateUserError as err:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(err),
        )
```

### 2.2 Global Exception Normalization
- Register global exception handlers in main app setup so all unhandled exceptions yield uniform JSON responses.

```python
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

app = FastAPI(title="Media API")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
            }
        },
    )
```

---

## 3. AsyncIO & Subprocess Safety Rules

### 3.1 Non-Blocking Event Loop Rules
- **Never call blocking functions in `async def`:** `time.sleep()`, `requests.get()`, or blocking disk I/O will freeze the entire server event loop!
- **Fix:** Use `asyncio.sleep()`, `httpx.AsyncClient()`, `aiofiles`, or run CPU-bound work in a thread pool via `asyncio.to_thread()`.

```python
# ❌ BAD: Blocking time.sleep in async function!
async def check_status():
    time.sleep(5)  # Freezes all requests!
    return {"status": "ok"}

# ✅ GOOD: Non-blocking asyncio.sleep
async def check_status():
    await asyncio.sleep(5)
    return {"status": "ok"}

# ✅ GOOD: Offloading blocking CPU tasks
import asyncio

def heavy_image_processing(image_bytes: bytes) -> bytes:
    # CPU heavy computation...
    return processed_bytes

async def handle_image(image_bytes: bytes):
    result = await asyncio.to_thread(heavy_image_processing, image_bytes)
    return result
```

### 3.2 Safe Async Subprocess Execution (FFmpeg / Shell Commands)
- Always use `asyncio.create_subprocess_exec` (or `asyncio.create_subprocess_shell`) and consume stdout/stderr via `communicate()` to avoid OS pipe deadlock.

```python
import asyncio
import logging

logger = logging.getLogger(__name__)

async def run_ffmpeg_command(cmd: list[str]) -> bool:
    """Executes FFmpeg safely without pipe deadlock."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        
        stdout, stderr = await proc.communicate()
        
        if proc.returncode != 0:
            err_msg = stderr.decode("utf-8", errors="ignore")
            logger.error(f"FFmpeg failed (code {proc.returncode}): {err_msg}")
            return False
            
        return True
    except Exception as e:
        logger.error(f"Failed to execute command {' '.join(cmd)}: {e}")
        return False
```

---

## 4. Python Anti-Patterns Checklist

- [ ] **No bare `except:`:** Always catch specific exceptions (`except ValueError:`, `except KeyError:`) or `except Exception:`.
- [ ] **No mutable default arguments:** Never use `def func(items=[])`. Use `def func(items: list[str] | None = None):`.
- [ ] **Context Manager Usage:** Always use `with open(...)` or `async with httpx.AsyncClient()` for resource cleanup.
- [ ] **String Formatting:** Use f-strings (`f"Hello {name}"`) instead of `%` formatting or `.format()`.
