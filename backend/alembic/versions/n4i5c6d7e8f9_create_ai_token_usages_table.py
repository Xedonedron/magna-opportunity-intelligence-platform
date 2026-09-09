"""create ai_token_usages table and add user_id to opportunity_chat_messages

Revision ID: n4i5c6d7e8f9
Revises: m3h4b5c6d7e8
Create Date: 2026-09-09 17:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'n4i5c6d7e8f9'
down_revision: Union[str, None] = 'm3h4b5c6d7e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create ai_token_usages table
    op.create_table(
        'ai_token_usages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('opportunity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('opportunities.id', ondelete='SET NULL'), nullable=True),
        sa.Column('feature', sa.String(length=50), nullable=False, server_default='opportunity_chat'),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False, server_default='google'),
        sa.Column('prompt_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completion_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('cost_usd', sa.Numeric(precision=10, scale=6), nullable=False, server_default='0.0'),
        sa.Column('cost_idr', sa.Numeric(precision=14, scale=2), nullable=False, server_default='0.0'),
        sa.Column('query_prompt', sa.Text(), nullable=True),
        sa.Column('response_preview', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='success'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('metadata_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_index('ix_ai_token_usages_created_at', 'ai_token_usages', ['created_at'], unique=False)
    op.create_index('ix_ai_token_usages_user_id', 'ai_token_usages', ['user_id'], unique=False)
    op.create_index('ix_ai_token_usages_opportunity_id', 'ai_token_usages', ['opportunity_id'], unique=False)
    op.create_index('ix_ai_token_usages_feature', 'ai_token_usages', ['feature'], unique=False)
    op.create_index('ix_ai_token_usages_model_name', 'ai_token_usages', ['model_name'], unique=False)

    # 2. Add user_id to opportunity_chat_messages
    op.add_column(
        'opportunity_chat_messages',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    )
    op.create_index('ix_opportunity_chat_messages_user_id', 'opportunity_chat_messages', ['user_id'], unique=False)


def downgrade() -> None:
    # 1. Drop user_id from opportunity_chat_messages
    op.drop_index('ix_opportunity_chat_messages_user_id', table_name='opportunity_chat_messages')
    op.drop_column('opportunity_chat_messages', 'user_id')

    # 2. Drop ai_token_usages table
    op.drop_index('ix_ai_token_usages_model_name', table_name='ai_token_usages')
    op.drop_index('ix_ai_token_usages_feature', table_name='ai_token_usages')
    op.drop_index('ix_ai_token_usages_opportunity_id', table_name='ai_token_usages')
    op.drop_index('ix_ai_token_usages_user_id', table_name='ai_token_usages')
    op.drop_index('ix_ai_token_usages_created_at', table_name='ai_token_usages')
    op.drop_table('ai_token_usages')
