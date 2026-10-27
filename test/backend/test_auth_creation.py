import os
import unittest
from unittest.mock import patch

os.environ['ENABLE_DB_MIGRATIONS'] = 'false'
os.environ['DATABASE_URL'] = 'sqlite:///./output/auth-test-bootstrap.db'
os.environ['WEBUI_SECRET_KEY'] = 'test-only-auth-creation-secret'

import bcrypt
from sqlalchemy import event, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from open_webui.internal import db as database
from open_webui.models.auths import Auth, Auths
from open_webui.models.users import User


class AuthCreationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_async_engine('sqlite+aiosqlite:///:memory:')
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)
        async with self.engine.begin() as connection:
            await connection.run_sync(
                lambda sync: database.Base.metadata.create_all(sync, tables=[Auth.__table__, User.__table__])
            )
        self.patch = patch.object(database, 'AsyncSessionLocal', self.sessions)
        self.patch.start()

    async def asyncTearDown(self):
        self.patch.stop()
        await self.engine.dispose()

    async def test_created_user_can_authenticate_with_session_sharing_disabled(self):
        hashed = bcrypt.hashpw(b'import-password', bcrypt.gensalt()).decode()
        with patch.object(database, 'DATABASE_ENABLE_SESSION_SHARING', False):
            user = await Auths.insert_new_auth('new@example.com', hashed, 'New User', role='user')

            async def verify(value):
                return bcrypt.checkpw(b'import-password', value.encode())

            authenticated = await Auths.authenticate_user('new@example.com', verify)
        self.assertIsNotNone(authenticated)
        self.assertEqual(authenticated[0].id, user.id)
        self.assertEqual(authenticated[0].role, 'user')
        self.assertTrue(authenticated[1].active)

    async def test_failed_credential_insert_leaves_no_unusable_user(self):
        def fail_insert(*args):
            raise RuntimeError('credential write failed')

        event.listen(Auth, 'before_insert', fail_insert)
        try:
            with patch.object(database, 'DATABASE_ENABLE_SESSION_SHARING', False):
                with self.assertRaises(RuntimeError):
                    await Auths.insert_new_auth('failed@example.com', 'hash', 'Failed User', role='user')
        finally:
            event.remove(Auth, 'before_insert', fail_insert)
        async with self.sessions() as session:
            self.assertEqual(list((await session.execute(select(User))).scalars()), [])
            self.assertEqual(list((await session.execute(select(Auth))).scalars()), [])

    async def test_creation_with_session_sharing_enabled(self):
        async with self.sessions() as session:
            with patch.object(database, 'DATABASE_ENABLE_SESSION_SHARING', True):
                user = await Auths.insert_new_auth('shared@example.com', 'hash', 'Shared User', role='user', db=session)
            self.assertIsNotNone(await session.get(User, user.id))
            self.assertTrue((await session.get(Auth, user.id)).active)

    async def test_duplicate_creation_preserves_original_credentials(self):
        original = await Auths.insert_new_auth('duplicate@example.com', 'original-hash', 'Original', role='user')
        with self.assertRaises(IntegrityError):
            await Auths.insert_new_auth('duplicate@example.com', 'replacement-hash', 'Replacement', role='user')
        async with self.sessions() as session:
            self.assertEqual(len(list((await session.execute(select(User))).scalars())), 1)
            self.assertEqual(len(list((await session.execute(select(Auth))).scalars())), 1)
            self.assertEqual((await session.get(User, original.id)).name, 'Original')
            self.assertEqual((await session.get(Auth, original.id)).password, 'original-hash')


if __name__ == '__main__':
    unittest.main()
